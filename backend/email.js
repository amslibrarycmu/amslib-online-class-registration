const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_AUTH_USER,
    pass: process.env.EMAIL_AUTH_PASS,
  },
});

async function sendEmail(mailOptions) {
  try {
    const optionsWithFrom = {
      ...mailOptions,
      from: `"AMSLIB Class Registration" <${process.env.EMAIL_FROM_ADDRESS}>`,
    };

    console.log(`[Email] Attempting to send email to: ${optionsWithFrom.to}`);
    const info = await transporter.sendMail(optionsWithFrom);
    console.log(`[Email] ✅ Message sent successfully to ${optionsWithFrom.to}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Email] ❌ Failed to send email to ${mailOptions.to}.`, error);
  }
}

const sendRegistrationConfirmation = async (userEmail, classDetails, userName) => {
  const mailOptions = {
    to: userEmail,
    subject: `ยืนยันการลงทะเบียนเรียน: ${classDetails.title}`,
    html: `<p>สวัสดีคุณ ${userName},</p>
           <p>คุณได้ลงทะเบียนเรียนในหัวข้อ "${classDetails.title}" สำเร็จแล้ว</p>
           <p>รายละเอียดเพิ่มเติมสามารถดูได้ที่เว็บไซต์</p>`,
  };
  await sendEmail(mailOptions);
};

const sendAdminNotification = async (adminEmails, classDetails, user) => {
  const mailOptions = {
    to: adminEmails,
    subject: `[Admin] มีผู้ใช้ลงทะเบียนเรียน: ${classDetails.title}`,
    html: `<p>ผู้ใช้ ${user.name} (${user.email}) ได้ลงทะเบียนเรียนในหัวข้อ "${classDetails.title}"</p>`,
  };
  await sendEmail(mailOptions);
};

const sendAdminCancellationNotification = async (adminEmails, classDetails, user) => {
    const mailOptions = {
      to: adminEmails,
      subject: `[Admin] มีผู้ใช้ยกเลิกการลงทะเบียน: ${classDetails.title}`,
      html: `<p>ผู้ใช้ ${user.name} (${user.email}) ได้ยกเลิกการลงทะเบียนในหัวข้อ "${classDetails.title}"</p>`,
    };
    await sendEmail(mailOptions);
};

const sendNewClassRequestAdminNotification = async (adminEmails, requestDetails, user) => {
    const mailOptions = {
      to: adminEmails,
      subject: `[Admin] มีคำขอเปิดคลาสเรียนใหม่: ${requestDetails.title}`,
      html: `<p>ผู้ใช้ ${user.name} (${user.email}) ได้ส่งคำขอเปิดคลาสเรียนใหม่ในหัวข้อ "${requestDetails.title}"</p>
             <p>รายละเอียด: ${requestDetails.description}</p>`,
    };
    await sendEmail(mailOptions);
};

const sendRequestApprovedNotification = async (userEmail, requestDetails) => {
    const mailOptions = {
      to: userEmail,
      subject: `คำขอเปิดคลาสเรียนของคุณได้รับการอนุมัติแล้ว: ${requestDetails.title}`,
      html: `<p>คำขอเปิดคลาสเรียนในหัวข้อ "${requestDetails.title}" ของคุณได้รับการอนุมัติแล้ว และจะถูกจัดเป็นคลาสเรียนเร็วๆ นี้</p>`,
    };
    await sendEmail(mailOptions);
};

const sendRequestRejectedNotification = async (userEmail, requestDetails, reason) => {
    const mailOptions = {
      to: userEmail,
      subject: `คำขอเปิดคลาสเรียนของคุณถูกปฏิเสธ: ${requestDetails.title}`,
      html: `<p>คำขอเปิดคลาสเรียนในหัวข้อ "${requestDetails.title}" ของคุณถูกปฏิเสธ</p>
             <p>เหตุผล: ${reason}</p>`,
    };
    await sendEmail(mailOptions);
};

const sendReminderEmail = async (userEmail, classDetails, userName) => {
    const mailOptions = {
      to: userEmail,
      subject: `แจ้งเตือนคลาสเรียนวันพรุ่งนี้: ${classDetails.title}`,
      html: `<p>สวัสดีคุณ ${userName},</p>
             <p>ขอแจ้งเตือนว่าคลาสเรียน "${classDetails.title}" จะเริ่มในวันพรุ่งนี้</p>`,
    };
    await sendEmail(mailOptions);
};

const sendRequestSubmittedConfirmation = async (userEmail, requestDetails) => {
    const mailOptions = {
      to: userEmail,
      subject: `เราได้รับคำขอเปิดคลาสเรียนของคุณแล้ว: ${requestDetails.title}`,
      html: `<p>เราได้รับคำขอเปิดคลาสเรียนในหัวข้อ "${requestDetails.title}" ของคุณแล้ว และจะแจ้งผลให้ทราบอีกครั้ง</p>`,
    };
    await sendEmail(mailOptions);
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
