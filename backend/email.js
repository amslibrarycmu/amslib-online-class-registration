const nodemailer = require("nodemailer");
const fs = require('fs').promises;
const path = require('path');

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

async function sendEmail(mailOptions) {
  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: `"AMS Library Class Registration System (HSL KM)" <${process.env.EMAIL_FROM_ADDRESS}>`,
      ...mailOptions,
    });

    console.log(`✅ Email sent for subject "${mailOptions.subject}": ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Preview URL: ${previewUrl}`);
    }
  } catch (error) {
    console.error(`❌ Error sending email for subject "${mailOptions.subject}":`, error);
  }
}

async function sendRegistrationConfirmation(
  recipientEmail,
  classDetails,
  studentName
) {
  try {
    // Use environment variable for backend URL, with a fallback for development
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    const templateData = {
      studentName: studentName,
      classTitle: classDetails.title,
      classDescription: classDetails.description ? `<p style="font-style: italic; color: #555;">${classDetails.description}</p>` : "",
      classId: classDetails.class_id,
      classSpeaker: classDetails.speaker,
      classStartDate: new Date(classDetails.start_date).toLocaleDateString("th-TH"),
      classEndDate: new Date(classDetails.end_date).toLocaleDateString("th-TH"),
      classStartTime: classDetails.start_time.substring(0, 5),
      classEndTime: classDetails.end_time.substring(0, 5),
      classFormat: classDetails.format,
      classLinkSection: classDetails.format !== "ONSITE" ? `<p><strong>ลิงก์เข้าร่วม:</strong> <a href="${classDetails.join_link}">${classDetails.join_link}</a></p>` : "",
      classLocationSection: classDetails.format !== "ONLINE" ? `<p><strong>สถานที่:</strong> ${classDetails.location}</p>` : "",
      classMaterialsSection: createMaterialsSection(classDetails.materials, backendUrl),
    };

    const htmlContent = await loadTemplate('registration-confirmation', templateData);

    await sendEmail({
      to: recipientEmail,
      subject: `ยืนยันการลงทะเบียน ${classDetails.title}`,
      html: htmlContent,
    });
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
    const templateData = {
      classTitle: classDetails.title,
      classId: classDetails.class_id,
      newRegistrantName: allRegisteredUsers[allRegisteredUsers.length - 1].name,
      newRegistrantEmail: allRegisteredUsers[allRegisteredUsers.length - 1].email,
      registrantCount: allRegisteredUsers.length,
      userListHtml: userListHtml,
    };
    const htmlContent = await loadTemplate('admin-new-registrant', templateData);
    await sendEmail({
      to: adminEmails.join(", "),
      subject: `[ระบบแจ้งเตือน] มีผู้ลงทะเบียนใหม่ในห้องเรียน ชื่อ ${classDetails.title}`,
      html: htmlContent,
    });
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
    const templateData = {
      classTitle: classDetails.title,
      classId: classDetails.class_id,
      cancelingUserName: studentName,
      cancelingUserEmail: studentEmail,
      remainingUserCount: remainingUsers.length,
      userListHtml: userListHtml,
    };
    const htmlContent = await loadTemplate('admin-cancellation', templateData);
    await sendEmail({
      to: adminEmails.join(", "),
      subject: `[ระบบแจ้งเตือน] มีผู้ยกเลิกลงทะเบียนจากห้องเรียน ชื่อ ${classDetails.title}`,
      html: htmlContent,
    });
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
    const templateData = {
      requestTitle: requestDetails.title || 'ไม่มีชื่อเรื่อง',
      requesterName: requestDetails.requestedBy.name || 'ไม่พบชื่อ',
      requesterEmail: requestDetails.requestedBy.email || 'ไม่พบอีเมล',
      requestReason: requestDetails.reason || "-",
      requestDate: new Date().toLocaleDateString("th-TH"),
    };
    const htmlContent = await loadTemplate('admin-new-request', templateData);
    await sendEmail({
      to: adminEmails.join(", "),
      subject: `[ระบบแจ้งเตือน] มีคำขอเปิดห้องเรียนใหม่ ชื่อ "${requestDetails.title}"`,
      html: htmlContent,
    });
  } catch (error) {
    console.error(
      "Error sending new class request admin notification email:",
      error
    );
  }
}

// เพิ่มฟังก์ชันสำหรับส่งอีเมลยืนยันการยื่นคำขอ
async function sendRequestSubmittedConfirmation(recipientEmail, requestDetails, requesterName) {
  try {
    const templateData = {
      requesterName: requesterName,
      requestTitle: requestDetails.title,
    };
    const htmlContent = await loadTemplate('request-submitted', templateData);
    await sendEmail({
      to: recipientEmail,
      subject: `[AMSLIB] ได้รับคำขอเปิดห้องเรียนของคุณแล้ว: ${requestDetails.title}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error(
      "Error sending class request submission confirmation email:",
      error
    );
  }
}

// เพิ่มฟังก์ชันสำหรับส่งอีเมลแจ้งการอนุมัติ
async function sendRequestApprovedNotification(recipientEmail, requestDetails) {
  try {
    const templateData = {
      requesterName: requestDetails.requested_by_name || requestDetails.user_email,
      requestTitle: requestDetails.title,
    };
    const htmlContent = await loadTemplate('request-approved', templateData);
    await sendEmail({
      to: recipientEmail,
      subject: `แจ้งผลการพิจารณาคำขอหลักสูตร ${requestDetails.title} "ได้รับการอนุมัติแล้ว"`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Error sending request approved email:", error);
  }
}

// เพิ่มฟังก์ชันสำหรับส่งอีเมลแจ้งการปฏิเสธ
async function sendRequestRejectedNotification( // Make this async as well for consistency
  recipientEmail,
  requestDetails,
  rejectionReason
) {
  try {
    const templateData = {
      requesterName: requestDetails.requested_by_name || requestDetails.user_email,
      requestTitle: requestDetails.title,
      rejectionReasonSection: rejectionReason ? `<p><strong>เหตุผล:</strong> ${rejectionReason}</p>` : "",
    };
    const htmlContent = await loadTemplate('request-rejected', templateData);
    await sendEmail({
      to: recipientEmail,
      subject: `แจ้งผลการพิจารณาคำขอหลักสูตร: ${requestDetails.title} "ไม่ได้รับการอนุมัติ"`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Error sending request rejected email:", error);
  }
}

async function sendReminderEmail(recipientEmail, classDetails, studentName) {
  try {
    // Use environment variable for backend URL, with a fallback for development
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    const templateData = {
      studentName: studentName,
      classTitle: classDetails.title,
      classDescription: classDetails.description ? `<p style="font-style: italic; color: #555;">${classDetails.description}</p>` : "",
      classId: classDetails.class_id,
      classSpeaker: classDetails.speaker,
      classStartDate: new Date(classDetails.start_date).toLocaleDateString("th-TH"),
      classEndDate: new Date(classDetails.end_date).toLocaleDateString("th-TH"),
      classStartTime: classDetails.start_time.substring(0, 5),
      classEndTime: classDetails.end_time.substring(0, 5),
      classFormat: classDetails.format,
      classLinkSection: classDetails.format !== "ONSITE" ? `<p><strong>ลิงก์เข้าร่วม:</strong> <a href="${classDetails.join_link}">${classDetails.join_link}</a></p>` : "",
      classLocationSection: classDetails.format !== "ONLINE" ? `<p><strong>สถานที่:</strong> ${classDetails.location}</p>` : "",
      classMaterialsSection: createMaterialsSection(classDetails.materials, backendUrl),
    };
    const htmlContent = await loadTemplate('class-reminder', templateData);
    await sendEmail({
      to: recipientEmail,
      subject: `[แจ้งเตือน] ห้องเรียน "${classDetails.title}" จะเริ่มใน 24 ชั่วโมง`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Error sending reminder email:", error);
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
  sendRequestSubmittedConfirmation, // Export ฟังก์ชันใหม่
};
