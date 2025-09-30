const nodemailer = require("nodemailer");
require("dotenv").config();

async function createTransporter() {
  if (process.env.NODE_ENV !== "production") {
    let testAccount = await nodemailer.createTestAccount();
    console.log("Ethereal test account created.");
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  // This part will only run if NODE_ENV is "production"
  let transportOptions;
  if (process.env.EMAIL_SERVICE) {
    // Option 1: Use a well-known service (e.g., "gmail")
    transportOptions = {
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_AUTH_USER,
        pass: process.env.EMAIL_AUTH_PASS,
      },
    };
  } else {
    // Option 2: Use custom SMTP settings for other providers
    transportOptions = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: process.env.EMAIL_SECURE === "true", // `secure:true` for port 465, `secure:false` for port 587
      auth: {
        user: process.env.EMAIL_AUTH_USER,
        pass: process.env.EMAIL_AUTH_PASS,
      },
    };
  }
  return nodemailer.createTransport(transportOptions);
}

async function sendRegistrationConfirmation(
  recipientEmail,
  classDetails,
  studentName
) {
  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: `"AMS Library Class Registration System (HSL KM)" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: recipientEmail,
      subject: `ยืนยันการลงทะเบียน ${classDetails.title}`,
      html: `
                <p>เรียน คุณ ${studentName},</p>
                <p>ห้องสมุดคณะเทคนิคการแพทย์ ขอแจ้งให้ทราบว่าท่านได้ลงทะเบียนเข้าร่วมการอบรมเชิงปฏิบัติการดังต่อไปนี้เรียบร้อยแล้ว</p>
                <hr>
                <h2>${classDetails.title}</h2>
                ${
                  classDetails.description
                    ? `<p style="font-style: italic; color: #555;">${classDetails.description}</p>`
                    : ""
                }
                <p><strong>Class ID:</strong> ${classDetails.class_id}</p>
                <p><strong>วิทยากร:</strong> ${classDetails.speaker}</p>
                <p><strong>วันที่:</strong> ${new Date(
                  classDetails.start_date
                ).toLocaleDateString("th-TH")} - ${new Date(
        classDetails.end_date
      ).toLocaleDateString("th-TH")}</p>
                <p><strong>เวลา:</strong> ${classDetails.start_time} - ${
        classDetails.end_time
      } น.</p>
                <p><strong>รูปแบบ:</strong> ${classDetails.format}</p>
                ${
                  classDetails.format !== "ONSITE"
                    ? `<p><strong>ลิงก์เข้าร่วม:</strong> <a href="${classDetails.join_link}">${classDetails.join_link}</a></p>`
                    : ""
                }
                ${
                  classDetails.format !== "ONLINE"
                    ? `<p><strong>สถานที่:</strong> ${classDetails.location}</p>`
                    : ""
                }
                <hr>
                <p>เราจะส่งอีเมลแจ้งเตือนท่านอีกครั้ง 24 ชั่วโมงก่อนห้องเรียนจะเริ่มขึ้น</p>
                <p>จึงเรียนมาเพื่อโปรดทราบ</p>
                <p>ขอแสดงความนับถือ<br>ห้องสมุดคณะเทคนิคการแพทย์</p>
                <p>หมายเหตุ: นี่เป็นเพียงจดหมายตอบกลับอัตโนมัติของระบบ หากต้องการสอบถามเพิ่มเติม ท่านสามารถติดต่อเจ้าหน้าที่ห้องสมุดได้โดยตรง</p>
            `,
    };
    let info = await transporter.sendMail(mailOptions);
    console.log("Message sent to user: %s", info.messageId);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("User Email Preview URL: %s", previewUrl);
    }
  } catch (error) {
    console.error("Error sending registration confirmation email:", error);
  }
}

async function sendAdminNotification(
  adminEmails,
  classDetails,
  allRegisteredUsers
) {
  if (!adminEmails || adminEmails.length === 0) {
    console.log("No admin emails found to send notification.");
    return;
  }

  const userListHtml = allRegisteredUsers
    .map((user) => `<li>${user.name} (${user.email})</li>`)
    .join("");

  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: `"AMS Library Class Registration System (HSL KM)" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: adminEmails.join(", "),
      subject: `[ระบบแจ้งเตือน] มีผู้ลงทะเบียนใหม่ในห้องเรียน ชื่อ ${classDetails.title}`,
      html: `
                <p>เรียน ผู้ดูแลระบบ,</p>
                <p><strong>${classDetails.title}</strong> (ID: ${
        classDetails.class_id
      })</p>
                <p>มีผู้ลงทะเบียนล่าสุด: <strong>${
                  allRegisteredUsers[allRegisteredUsers.length - 1].name
                } (${
        allRegisteredUsers[allRegisteredUsers.length - 1].email
      })</strong></p>
                <hr>
                <h3>รายชื่อผู้ลงทะเบียนทั้งหมดในขณะนี้ (${
                  allRegisteredUsers.length
                } คน):</h3>
                <ul>
                    ${userListHtml}
                </ul>
                <hr>
            `,
    };

    let info = await transporter.sendMail(mailOptions);
    console.log("Admin notification sent: %s", info.messageId);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Admin Notification Preview URL: %s", previewUrl);
    }
  } catch (error) {
    console.error("Error sending admin notification email:", error);
  }
}

async function sendAdminCancellationNotification(
  adminEmails,
  studentName,
  studentEmail,
  classDetails,
  remainingUsers
) {
  if (!adminEmails || adminEmails.length === 0) {
    console.log("No admin emails found to send cancellation notification.");
    return;
  }

  const userListHtml = remainingUsers
    .map((user) => `<li>${user.name} (${user.email})</li>`)
    .join("");

  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: `"AMS Library Class Registration System (HSL KM)" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: adminEmails.join(", "),
      subject: `[ระบบแจ้งเตือน] มีผู้ยกเลิกลงทะเบียนจากห้องเรียน ชื่อ ${classDetails.title}`,
      html: `
                <p>เรียน ผู้ดูแลระบบ,</p>
                <p><strong>${classDetails.title} (ID: ${classDetails.class_id})</strong></p>
                <p>มีผู้ยกเลิกการลงทะเบียน: <strong>${studentName} (${studentEmail})</strong></p>
                <hr>
                <h3>รายชื่อผู้ลงทะเบียนที่เหลืออยู่ (${remainingUsers.length} คน):</h3>
                <ul>
                    ${userListHtml}
                </ul>
                <hr>
            `,
    };

    let info = await transporter.sendMail(mailOptions);
    console.log("Admin cancellation notification sent: %s", info.messageId);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(
        "Admin Cancellation Notification Preview URL: %s",
        previewUrl
      );
    }
  } catch (error) {
    console.error(
      "Error sending admin cancellation notification email:",
      error
    );
  }
}

// เพิ่มฟังก์ชันสำหรับส่งอีเมลแจ้งว่ามีคำขอเปิดห้องเรียนใหม่
async function sendNewClassRequestAdminNotification(
  adminEmails,
  requestDetails
) {
  if (!adminEmails || adminEmails.length === 0) {
    console.log(
      "No admin emails found to send new class request notification."
    );
    return;
  }

  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: `"AMS Library Class Registration System (HSL KM)" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: adminEmails.join(", "),
      subject: `[ระบบแจ้งเตือน] มีคำขอเปิดห้องเรียนใหม่ ชื่อ "${requestDetails.title}"`,
      html: `
                <h2>มีคำขอเปิดห้องเรียนใหม่</h2>
                <p><strong>หัวข้อ:</strong> ${requestDetails.title || 'ไม่มีชื่อเรื่อง'}</p>
                <p><strong>ผู้เสนอ:</strong> ${requestDetails.requestedBy.name || 'ไม่พบชื่อ'} (${
        requestDetails.requestedBy.email || 'ไม่พบอีเมล'
      })</p>
                <p>เหตุผล: ${requestDetails.reason || "-"}</p>
                <p>วันที่เสนอ: ${new Date().toLocaleDateString("th-TH")}</p>
                <hr>
                <p>โปรดเข้าสู่ระบบเพื่อตรวจสอบและดำเนินการต่อ</p>
            `,
    };

    let info = await transporter.sendMail(mailOptions);
    console.log(
      "New class request admin notification sent: %s",
      info.messageId
    );
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(
        "New Class Request Admin Notification Preview URL: %s",
        previewUrl
      );
    }
  } catch (error) {
    console.error(
      "Error sending new class request admin notification email:",
      error
    );
  }
}

// เพิ่มฟังก์ชันสำหรับส่งอีเมลแจ้งการอนุมัติ
async function sendRequestApprovedNotification(requestDetails) {
  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: `"AMS Library Class Registration System (HSL KM)" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: requestDetails.user_email,
      subject: `แจ้งผลการพิจารณาคำขอหลักสูตร ${requestDetails.title} "ได้รับการอนุมัติแล้ว"`,
      html: `
                <p>เรียน คุณ ${
                  requestDetails.requested_by_name || requestDetails.user_email
                },</p>
                <p>ตามที่ท่านได้ยื่นคำขอเปิดหลักสูตร <strong>"${requestDetails.title}"</strong> ขณะนี้คำขอของท่านได้รับการอนุมัติเรียบร้อยแล้ว</p>
                <p>ท่านสามารถติดตามความคืบหน้าของหลักสูตรนี้ได้ในระบบต่อไป</p>
                <hr>
                <p>ขอแสดงความนับถือ<br>ห้องสมุดคณะเทคนิคการแพทย์</p>
                <p>หมายเหตุ: นี่เป็นเพียงจดหมายตอบกลับอัตโนมัติของระบบ หากต้องการสอบถามเพิ่มเติม ท่านสามารถติดต่อเจ้าหน้าที่ห้องสมุดได้โดยตรง</p>
            `,
    };
    let info = await transporter.sendMail(mailOptions);
    console.log("Request approved email sent: %s", info.messageId);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Request Approved Email Preview URL: %s", previewUrl);
    }
  } catch (error) {
    console.error("Error sending request approved email:", error);
  }
}

// เพิ่มฟังก์ชันสำหรับส่งอีเมลแจ้งการปฏิเสธ
async function sendRequestRejectedNotification(
  requestDetails,
  rejectionReason
) {
  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: `"AMS Library Class Registration System (HSL KM)" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: requestDetails.user_email,
      subject: `แจ้งผลการพิจารณาคำขอหลักสูตร: ${requestDetails.title} "ไม่ได้รับการอนุมัติ"`,
      html: `
                <p>เรียน คุณ ${
                  requestDetails.requested_by_name || requestDetails.user_email
                },</p>
                <p>คำขอหลักสูตร <strong>"${
                  requestDetails.title
                }"</strong> ของท่านยังไม่ได้รับการอนุมัติ</p>
                ${
                  rejectionReason
                    ? `<p><strong>เหตุผล:</strong> ${rejectionReason}</p>`
                    : ""
                }
                <hr>
                <p>ขอแสดงความนับถือ<br>ห้องสมุดคณะเทคนิคการแพทย์</p>
                <p>หมายเหตุ: นี่เป็นเพียงจดหมายตอบกลับอัตโนมัติของระบบ หากต้องการสอบถามเพิ่มเติม ท่านสามารถติดต่อเจ้าหน้าที่ห้องสมุดได้โดยตรง</p>
            `,
    };
    let info = await transporter.sendMail(mailOptions);
    console.log("Request rejected email sent: %s", info.messageId);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Request Rejected Email Preview URL: %s", previewUrl);
    }
  } catch (error) {
    console.error("Error sending request rejected email:", error);
  }
}

async function sendReminderEmail(recipientEmail, classDetails, studentName) {
  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: `"AMS Library Class Registration System (HSL KM)" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: recipientEmail,
      subject: `[แจ้งเตือน] ห้องเรียน "${classDetails.title}" จะเริ่มใน 24 ชั่วโมง`,
      html: `
                <p>เรียน คุณ ${studentName},</p>
                <p>ห้องสมุดคณะเทคนิคการแพทย์ ขอแจ้งเตือนว่าห้องเรียนที่ท่านได้ลงทะเบียนไว้จะเริ่มในอีก 24 ชั่วโมงข้างหน้า</p>
                <hr>
                <h2>${classDetails.title}</h2>
                ${
                  classDetails.description
                    ? `<p style="font-style: italic; color: #555;">${classDetails.description}</p>`
                    : ""
                }
                <p><strong>Class ID:</strong> ${classDetails.class_id}</p>
                <p><strong>วิทยากร:</strong> ${classDetails.speaker}</p>
                <p><strong>วันที่:</strong> ${new Date(
                  classDetails.start_date
                ).toLocaleDateString("th-TH")} - ${new Date(
        classDetails.end_date
      ).toLocaleDateString("th-TH")}</p>
                <p><strong>เวลา:</strong> ${classDetails.start_time} - ${
        classDetails.end_time
      } น.</p>
                <p><strong>รูปแบบ:</strong> ${classDetails.format}</p>
                ${
                  classDetails.format !== "ONSITE"
                    ? `<p><strong>ลิงก์เข้าร่วม:</strong> <a href="${classDetails.join_link}">${classDetails.join_link}</a></p>`
                    : ""
                }
                ${
                  classDetails.format !== "ONLINE"
                    ? `<p><strong>สถานที่:</strong> ${classDetails.location}</p>`
                    : ""
                }
                <hr>
                <p>โปรดเตรียมตัวให้พร้อมสำหรับการเข้าร่วม</p>
                <p>ขอแสดงความนับถือ<br>ห้องสมุดคณะเทคนิคการแพทย์</p>
                <p>หมายเหตุ: นี่เป็นเพียงจดหมายตอบกลับอัตโนมัติของระบบ หากต้องการสอบถามเพิ่มเติม ท่านสามารถติดต่อเจ้าหน้าที่ห้องสมุดได้โดยตรง</p>
            `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder email sent to ${recipientEmail} for class ${classDetails.class_id}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Reminder Email Preview URL: ${previewUrl}`);
    }
  } catch (error) {
    console.error(`❌ Error sending reminder email to ${recipientEmail}:`, error);
  }
}

module.exports = {
  sendRegistrationConfirmation,
  sendAdminNotification,
  sendAdminCancellationNotification,
  sendNewClassRequestAdminNotification,
  sendRequestApprovedNotification,
  sendRequestRejectedNotification,
  sendReminderEmail,
};
