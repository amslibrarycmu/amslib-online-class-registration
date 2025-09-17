const nodemailer = require('nodemailer');
require('dotenv').config();

async function createTransporter() {
    if (process.env.NODE_ENV !== "production") {
        let testAccount = await nodemailer.createTestAccount();
        console.log('Ethereal test account created.');
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
        });
    }
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

async function sendRegistrationConfirmation(recipientEmail, classDetails, studentName) {
    try {
        const transporter = await createTransporter();
        const mailOptions = {
            from: '"AMSLIB Course Registration" <noreply@amslib.com>',
            to: recipientEmail,
            subject: `ยืนยันการลงทะเบียนเรียน: ${classDetails.title}`,
            html: `
                <h1>ยืนยันการลงทะเบียนสำเร็จ</h1>
                <p>สวัสดีครับ/ค่ะ คุณ ${studentName},</p>
                <p>คุณได้ลงทะเบียนเข้าร่วมการอบรมหลักสูตรต่อไปนี้สำเร็จแล้ว:</p>
                <hr>
                <h2>${classDetails.title}</h2>
                <p><strong>รหัสวิชา:</strong> ${classDetails.class_id}</p>
                <p><strong>วิทยากร:</strong> ${classDetails.speaker}</p>
                <p><strong>วันที่:</strong> ${new Date(classDetails.start_date).toLocaleDateString('th-TH')} - ${new Date(classDetails.end_date).toLocaleDateString('th-TH')}</p>
                <p><strong>เวลา:</strong> ${classDetails.start_time} - ${classDetails.end_time}</p>
                <p><strong>รูปแบบ:</strong> ${classDetails.format}</p>
                ${classDetails.format !== 'ONSITE' ? `<p><strong>ลิงก์เข้าร่วม:</strong> <a href="${classDetails.join_link}">${classDetails.join_link}</a></p>` : ''}
                ${classDetails.format !== 'ONLINE' ? `<p><strong>สถานที่:</strong> ${classDetails.location}</p>` : ''}
                <hr>
                <p>ขอขอบคุณที่ให้ความสนใจ</p>
                <p>ทีมงาน AMSLIB</p>
            `,
        };
        let info = await transporter.sendMail(mailOptions);
        console.log('Message sent to user: %s', info.messageId);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('User Email Preview URL: %s', previewUrl);
        }
    } catch (error) {
        console.error('Error sending registration confirmation email:', error);
    }
}

async function sendAdminNotification(adminEmails, classDetails, allRegisteredUsers) {
    if (!adminEmails || adminEmails.length === 0) {
        console.log("No admin emails found to send notification.");
        return;
    }

    const userListHtml = allRegisteredUsers.map(user => `<li>${user.name} (${user.email})</li>`).join('');

    try {
        const transporter = await createTransporter();
        const mailOptions = {
            from: '"AMSLIB Course Registration" <noreply@amslib.com>',
            to: adminEmails.join(', '),
            subject: `[แจ้งเตือน] มีผู้ลงทะเบียนใหม่: ${classDetails.title}`,
            html: `
                <h1>[แจ้งเตือน] มีผู้ลงทะเบียนใหม่</h1>
                <p>หลักสูตร: <strong>${classDetails.title}</strong> (ID: ${classDetails.class_id})</p>
                <p>ผู้ลงทะเบียนล่าสุด: <strong>${allRegisteredUsers[allRegisteredUsers.length - 1].name} (${allRegisteredUsers[allRegisteredUsers.length - 1].email})</strong></p>
                <hr>
                <h3>รายชื่อผู้ลงทะเบียนทั้งหมดในขณะนี้ (${allRegisteredUsers.length} คน):</h3>
                <ul>
                    ${userListHtml}
                </ul>
                <hr>
            `,
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('Admin notification sent: %s', info.messageId);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('Admin Notification Preview URL: %s', previewUrl);
        }
    } catch (error) {
        console.error('Error sending admin notification email:', error);
    }
}

async function sendAdminCancellationNotification(adminEmails, studentName, studentEmail, classDetails, remainingUsers) {
    if (!adminEmails || adminEmails.length === 0) {
        console.log("No admin emails found to send cancellation notification.");
        return;
    }

    const userListHtml = remainingUsers.map(user => `<li>${user.name} (${user.email})</li>`).join('');

    try {
        const transporter = await createTransporter();
        const mailOptions = {
            from: '"AMSLIB Course Registration" <noreply@amslib.com>',
            to: adminEmails.join(', '),
            subject: `[แจ้งเตือน] มีผู้ยกเลิกลงทะเบียน: ${classDetails.title}`,
            html: `
                <h1>[แจ้งเตือน] มีผู้ยกเลิกลงทะเบียน</h1>
                <p>หลักสูตร: <strong>${classDetails.title} (ID: ${classDetails.class_id})</strong></p>
                <p>ผู้ยกเลิก: <strong>${studentName} (${studentEmail})</strong></p>
                <hr>
                <h3>รายชื่อผู้ลงทะเบียนที่เหลืออยู่ (${remainingUsers.length} คน):</h3>
                <ul>
                    ${userListHtml}
                </ul>
                <hr>
            `,
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('Admin cancellation notification sent: %s', info.messageId);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('Admin Cancellation Notification Preview URL: %s', previewUrl);
        }
    } catch (error) {
        console.error('Error sending admin cancellation notification email:', error);
    }
}

async function sendNewClassRequestAdminNotification(adminEmails, requestDetails) {
    if (!adminEmails || adminEmails.length === 0) {
        console.log("No admin emails found to send new class request notification.");
        return;
    }

    try {
        const transporter = await createTransporter();
        const mailOptions = {
            from: '"AMSLIB Course Registration" <noreply@amslib.com>',
            to: adminEmails.join(', '),
            subject: `[แจ้งเตือน] มีคำขอเปิดห้องเรียนใหม่: ${requestDetails.title}`,
            html: `
                <h1>[แจ้งเตือน] มีคำขอเปิดห้องเรียนใหม่</h1>
                <p>หัวข้อ: <strong>${requestDetails.title}</strong></p>
                <p>ผู้เสนอ: <strong>${requestDetails.requestedBy}</strong></p>
                <p>เหตุผล: ${requestDetails.reason || '-'}</p>
                <p>วันที่เสนอ: ${new Date().toLocaleDateString('th-TH')}</p>
                <hr>
                <p>โปรดเข้าสู่ระบบเพื่อตรวจสอบและดำเนินการ</p>
                <p>ทีมงาน AMSLIB</p>
            `,
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('New class request admin notification sent: %s', info.messageId);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('New Class Request Admin Notification Preview URL: %s', previewUrl);
        }
    } catch (error) {
        console.error('Error sending new class request admin notification email:', error);
    }
}

// เพิ่มฟังก์ชันสำหรับส่งอีเมลแจ้งการอนุมัติ
async function sendRequestApprovedNotification(recipientEmail, requestDetails) {
    try {
        const transporter = await createTransporter();
        const mailOptions = {
            from: '"AMSLIB Course Registration" <noreply@amslib.com>',
            to: recipientEmail,
            subject: `แจ้งผลการพิจารณาคำขอหลักสูตร: ${requestDetails.title} ได้รับการอนุมัติ`,
            html: `
                <h1>คำขอหลักสูตรของท่านได้รับการอนุมัติแล้ว</h1>
                <p>สวัสดีครับ/ค่ะ,</p>
                <p>คำขอหลักสูตร <strong>"${requestDetails.title}"</strong> ของท่านได้รับการอนุมัติจากผู้ดูแลระบบแล้ว</p>
                <p>ท่านสามารถติดตามความคืบหน้าของหลักสูตรนี้ได้ในระบบต่อไป</p>
                <hr>
                <p>ขอแสดงความนับถือ</p>
                <p>ทีมงาน AMSLIB</p>
            `,
        };
        let info = await transporter.sendMail(mailOptions);
        console.log('Request approved email sent: %s', info.messageId);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('Request Approved Email Preview URL: %s', previewUrl);
        }
    } catch (error) {
        console.error('Error sending request approved email:', error);
    }
}

// เพิ่มฟังก์ชันสำหรับส่งอีเมลแจ้งการปฏิเสธ
async function sendRequestRejectedNotification(recipientEmail, requestDetails) {
    try {
        const transporter = await createTransporter();
        const mailOptions = {
            from: '"AMSLIB Course Registration" <noreply@amslib.com>',
            to: recipientEmail,
            subject: `แจ้งผลการพิจารณาคำขอหลักสูตร: ${requestDetails.title} ไม่ได้รับการอนุมัติ`,
            html: `
                <h1>คำขอหลักสูตรของท่านไม่ได้รับการอนุมัติ</h1>
                <p>สวัสดีครับ/ค่ะ,</p>
                <p>คำขอหลักสูตร <strong>"${requestDetails.title}"</strong> ของท่านไม่ได้รับการอนุมัติจากผู้ดูแลระบบ</p>
                <p>หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อผู้ดูแลระบบได้โดยตรง</p>
                <hr>
                <p>ขอแสดงความนับถือ</p>
                <p>ทีมงาน AMSLIB</p>
            `,
        };
        let info = await transporter.sendMail(mailOptions);
        console.log('Request rejected email sent: %s', info.messageId);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('Request Rejected Email Preview URL: %s', previewUrl);
        }
    } catch (error) {
        console.error('Error sending request rejected email:', error);
    }
}

module.exports = { 
    sendRegistrationConfirmation,
    sendAdminNotification,
    sendAdminCancellationNotification,
    sendNewClassRequestAdminNotification,
    sendRequestApprovedNotification,
    sendRequestRejectedNotification
};