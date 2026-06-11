const nodemailer = require("nodemailer");
const fs = require("fs").promises;
const path = require("path");

let testAccount = null;

async function createTransporter() {
  // ทดสอบการส่งผ่าน Ethereal (โหมดพัฒนา)
  if (process.env.NODE_ENV !== "production") {
    if (!testAccount) {
      testAccount = await nodemailer.createTestAccount();
      console.log("Ethereal test account created:", testAccount);
    }
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  // โหมดใช้งานจริง (Production)
  let transportOptions;
  if (process.env.EMAIL_SERVICE) {
    transportOptions = {
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_AUTH_USER,
        pass: process.env.EMAIL_AUTH_PASS,
      },
    };
  } else {
    transportOptions = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: process.env.EMAIL_SECURE === "true",
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
      from: `"ระบบจัดการการอบรมเชิงปฏิบัติการ AMS Library Class" <${process.env.EMAIL_FROM_ADDRESS}>`,
      ...mailOptions,
    });

    if (process.env.NODE_ENV !== "production" && testAccount) {
      console.log("📧 Email sent: %s", info.messageId);
      console.log("📬 Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error(`❌ Error sending email for subject "${mailOptions.subject}":`, error);
  }
}

async function loadTemplate(templateName, data) {
  const templatePath = path.join(__dirname, "templates", `${templateName}.html`);
  let html = await fs.readFile(templatePath, "utf-8");
  for (const key in data) {
    const regex = new RegExp(`{{${key}}}`, "g");
    html = html.replace(regex, data[key] || "");
  }
  return html;
}

function createMaterialsSection(materialsJson, backendUrl) {
  let materials = [];
  try {
    if (typeof materialsJson === "string") {
      materials = JSON.parse(materialsJson);
    } else if (Array.isArray(materialsJson)) {
      materials = materialsJson;
    }
  } catch (e) {
    console.error("Could not parse materials JSON:", materialsJson);
    return "";
  }

  if (!Array.isArray(materials) || materials.length === 0) {
    return "";
  }

  const materialLinks = materials
    .map((material) => {
      const materialName = typeof material === "object" && material.name ? material.name : material;
      return `<li><a href="${backendUrl}/uploads/materials/${encodeURIComponent(materialName)}">${materialName}</a></li>`;
    })
    .join("");

  return `<p><strong>เอกสารประกอบการเรียน:</strong></p><ul>${materialLinks}</ul>`;
}

const sendRegistrationConfirmation = async (userEmail, classDetails, userName) => {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const templateData = {
      studentName: userName,
      classTitle: classDetails.title,
      classDescription: classDetails.description ? `<p style="font-style: italic; color: #555;">${classDetails.description}</p>` : "",
      classId: classDetails.class_id,
      classSpeaker: classDetails.speaker || "-",
      classStartDate: new Date(classDetails.start_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
      classEndDate: classDetails.end_date ? new Date(classDetails.end_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) : new Date(classDetails.start_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
      classStartTime: classDetails.start_time ? classDetails.start_time.substring(0, 5) : "",
      classEndTime: classDetails.end_time ? classDetails.end_time.substring(0, 5) : "",
      classFormat: classDetails.format,
      classLanguage: classDetails.language || "-",
      classLinkSection: classDetails.format !== "Onsite" && classDetails.join_link ? `<p><strong>ลิงก์เข้าร่วม:</strong> <a href="${classDetails.join_link}">${classDetails.join_link}</a></p>` : "",
      classLocationSection: classDetails.format !== "Online" && classDetails.location ? `<p><strong>สถานที่:</strong> ${classDetails.location}</p>` : "",
      classMaterialsSection: createMaterialsSection(classDetails.materials, backendUrl),
    };
    const htmlContent = await loadTemplate("registration-confirmation", templateData);
    await sendEmail({ to: userEmail, subject: `ยืนยันการลงทะเบียนเรียน: ${classDetails.title}`, html: htmlContent });
  } catch (error) {
    console.error("❌ Error in sendRegistrationConfirmation:", error);
  }
};

const sendAdminNotification = async (adminEmails, classDetails, arg3, arg4) => {
  try {
    // Fallback: หากเรียกแบบเก่า (adminEmails, classDetails, user)
    const allRegisteredUsers = Array.isArray(arg3) ? arg3 : [arg3].filter(Boolean);
    const newRegistrant = arg4 || arg3 || {};

    const userListHtml = allRegisteredUsers.map(u => `<li>${u.name} (${u.email})</li>`).join("");
    const templateData = {
      classId: classDetails.class_id,
      classTitle: classDetails.title,
      newRegistrantName: newRegistrant.name || "-",
      newRegistrantEmail: newRegistrant.email || "-",
      registrantCount: allRegisteredUsers.length,
      userListHtml: userListHtml,
    };
    const htmlContent = await loadTemplate("admin-new-registrant", templateData);
    await sendEmail({ to: adminEmails, subject: `[Admin] มีผู้ลงทะเบียนใหม่: ${classDetails.title}`, html: htmlContent });
  } catch (error) {
    console.error("❌ Error in sendAdminNotification:", error);
  }
};

const sendAdminCancellationNotification = async (adminEmails, classDetails, arg3, arg4) => {
  try {
    // Fallback: หากเรียกแบบเก่า (adminEmails, classDetails, user)
    const cancelingUser = arg3 || {};
    const remainingUsers = Array.isArray(arg4) ? arg4 : [];

    const userListHtml = remainingUsers.map(u => `<li>${u.name} (${u.email})</li>`).join("");
    const templateData = {
      classId: classDetails.class_id,
      classTitle: classDetails.title,
      cancelingUserName: cancelingUser.name || "-",
      cancelingUserEmail: cancelingUser.email || "-",
      remainingUserCount: remainingUsers.length,
      userListHtml: userListHtml,
    };
    const htmlContent = await loadTemplate("admin-cancellation", templateData);
    await sendEmail({ to: adminEmails, subject: `[Admin] มีผู้ยกเลิก: ${classDetails.title}`, html: htmlContent });
  } catch (error) {
    console.error("❌ Error in sendAdminCancellationNotification:", error);
  }
};

const sendNewClassRequestAdminNotification = async (adminEmails, requestDetails, user) => {
  try {
    const requester = user || requestDetails.requestedBy || {};
    const templateData = {
      requesterName: requester.name || requestDetails.requested_by_name || "ไม่ทราบชื่อ",
      requesterEmail: requester.email || requestDetails.user_email || "ไม่ทราบอีเมล",
      requestTitle: requestDetails.title,
      requestReason: requestDetails.reason || requestDetails.description || "-",
      requestDate: new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
    };
    const htmlContent = await loadTemplate("admin-new-request", templateData);
    await sendEmail({ to: adminEmails, subject: `[Admin] มีคำขอเปิดห้องเรียนใหม่: ${requestDetails.title}`, html: htmlContent });
  } catch (error) {
    console.error("❌ Error in sendNewClassRequestAdminNotification:", error);
  }
};

const sendRequestApprovedNotification = async (userEmail, requestDetails) => {
  try {
    const templateData = {
      requesterName: requestDetails.requested_by_name || requestDetails.user_email || "ผู้ใช้งาน",
      requestTitle: requestDetails.title,
    };
    const htmlContent = await loadTemplate("request-approved", templateData);
    await sendEmail({ to: userEmail, subject: `คำขอเปิดห้องเรียนของคุณได้รับการอนุมัติแล้ว: ${requestDetails.title}`, html: htmlContent });
  } catch (error) {
    console.error("❌ Error in sendRequestApprovedNotification:", error);
  }
};

const sendRequestRejectedNotification = async (userEmail, requestDetails, reason) => {
  try {
    const templateData = {
      requesterName: requestDetails.requested_by_name || requestDetails.user_email || "ผู้ใช้งาน",
      requestTitle: requestDetails.title,
      rejectionReasonSection: reason ? `<p><strong>เหตุผล:</strong> ${reason}</p>` : "<p>ทางเจ้าหน้าที่ไม่ได้ระบุเหตุผลในการปฏิเสธ</p>",
    };
    const htmlContent = await loadTemplate("request-rejected", templateData);
    await sendEmail({ to: userEmail, subject: `คำขอเปิดห้องเรียนของคุณถูกปฏิเสธ: ${requestDetails.title}`, html: htmlContent });
  } catch (error) {
    console.error("❌ Error in sendRequestRejectedNotification:", error);
  }
};

const sendReminderEmail = async (userEmail, classDetails, userName) => {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const templateData = {
      studentName: userName,
      classTitle: classDetails.title,
      classDescription: classDetails.description ? `<p style="font-style: italic; color: #555;">${classDetails.description}</p>` : "",
      classId: classDetails.class_id,
      classSpeaker: classDetails.speaker || "-",
      classStartDate: new Date(classDetails.start_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
      classEndDate: classDetails.end_date ? new Date(classDetails.end_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) : new Date(classDetails.start_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
      classStartTime: classDetails.start_time ? classDetails.start_time.substring(0, 5) : "",
      classEndTime: classDetails.end_time ? classDetails.end_time.substring(0, 5) : "",
      classFormat: classDetails.format,
      classLanguage: classDetails.language || "-",
      classLinkSection: classDetails.format !== "Onsite" && classDetails.join_link ? `<p><strong>ลิงก์เข้าร่วม:</strong> <a href="${classDetails.join_link}">${classDetails.join_link}</a></p>` : "",
      classLocationSection: classDetails.format !== "Online" && classDetails.location ? `<p><strong>สถานที่:</strong> ${classDetails.location}</p>` : "",
      classMaterialsSection: createMaterialsSection(classDetails.materials, backendUrl),
    };
    const htmlContent = await loadTemplate("class-reminder", templateData);
    await sendEmail({ to: userEmail, subject: `แจ้งเตือนคลาสเรียนวันพรุ่งนี้: ${classDetails.title}`, html: htmlContent });
  } catch (error) {
    console.error("❌ Error in sendReminderEmail:", error);
  }
};

const sendRequestSubmittedConfirmation = async (userEmail, requestDetails, requesterName) => {
  try {
    const templateData = {
      requesterName: requesterName || requestDetails.requested_by_name || "ผู้ใช้งาน",
      requestTitle: requestDetails.title,
    };
    const htmlContent = await loadTemplate("request-submitted", templateData);
    await sendEmail({ to: userEmail, subject: `เราได้รับคำขอเปิดคลาสเรียนของคุณแล้ว: ${requestDetails.title}`, html: htmlContent });
  } catch (error) {
    console.error("❌ Error in sendRequestSubmittedConfirmation:", error);
  }
};


module.exports = {
  sendRegistrationConfirmation,
  sendAdminNotification,
  sendAdminCancellationNotification,
  sendNewClassRequestAdminNotification,
  sendRequestApprovedNotification,
  sendRequestRejectedNotification,
  sendReminderEmail,
  sendRequestSubmittedConfirmation,
};
