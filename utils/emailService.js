import nodemailer from 'nodemailer';
import { config } from '../config/environment.js';

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

/**
 * Send appointment confirmation email
 * @param {Object} appointment - Appointment data
 * @param {Object} service - Service data
 * @returns {Promise}
 */
export const sendAppointmentConfirmation = async (appointment, service) => {
  const appointmentDate = new Date(appointment.appointmentDate);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const mailOptions = {
    from: `"Photography Studio" <${config.email.user}>`,
    to: appointment.customerEmail,
    subject: 'Appointment Confirmation - Photography Studio',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4F46E5; }
          .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          .status { display: inline-block; padding: 5px 10px; background: #FEF3C7; color: #92400E; border-radius: 15px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📸 Appointment Confirmed!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${appointment.customerName}</strong>,</p>
            
            <p>Your appointment has been successfully scheduled. We're looking forward to capturing your special moments!</p>
            
            <div class="details">
              <h3 style="margin-top: 0; color: #4F46E5;">Appointment Details</h3>
              <p><strong>Service:</strong> ${service.name}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${appointment.appointmentTime}</p>
              <p><strong>Duration:</strong> ${service.durationMinutes} minutes</p>
              <p><strong>Total:</strong> $${service.price.toFixed(2)}</p>
              <p><strong>Status:</strong> <span class="status">${appointment.status}</span></p>
            </div>
            
            ${appointment.specialRequests ? `
              <div style="background: #FFF3CD; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #856404;">Your Special Requests:</h4>
                <p style="margin: 0;">${appointment.specialRequests}</p>
              </div>
            ` : ''}
            
            <div style="background: #E8F5E8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #2E7D32;">Important Reminders:</h4>
              <ul>
                <li>Please arrive <strong>10-15 minutes</strong> before your scheduled time</li>
                <li>Bring any props or outfits you'd like to include in the photos</li>
                <li>Let us know if you have any specific pose ideas or themes</li>
              </ul>
            </div>
            
            <p>If you need to reschedule or cancel, please contact us at least <strong>24 hours</strong> in advance.</p>
          </div>
          <div class="footer">
            <p><strong>Photography Studio Team</strong></p>
            <p>📞 (555) 123-4567 | ✉️ contact@studiocom</p>
            <p>123 Studio Street, City, State 12345</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Confirmation email sent to ${appointment.customerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send confirmation email:', error);
    return false;
  }
};

/**
 * Send appointment reminder email (24 hours before)
 * @param {Object} appointment - Appointment data
 * @param {Object} service - Service data
 * @returns {Promise}
 */
export const sendAppointmentReminder = async (appointment, service) => {
  const appointmentDate = new Date(appointment.appointmentDate);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const mailOptions = {
    from: `"Photography Studio" <${config.email.user}>`,
    to: appointment.customerEmail,
    subject: 'Reminder: Your Photography Appointment Tomorrow',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #FF9800; }
          .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          .urgent { color: #D32F2F; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Appointment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${appointment.customerName}</strong>,</p>
            
            <p>This is a friendly reminder about your photography appointment <span class="urgent">tomorrow</span>!</p>
            
            <div class="details">
              <h3 style="margin-top: 0; color: #FF9800;">Appointment Details</h3>
              <p><strong>Service:</strong> ${service.name}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${appointment.appointmentTime}</p>
              <p><strong>Duration:</strong> ${service.durationMinutes} minutes</p>
            </div>
            
            <div style="background: #FFF3CD; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h4 style="margin-top: 0; color: #856404;">Preparation Tips:</h4>
              <ul>
                <li>Get a good night's sleep</li>
                <li>Stay hydrated</li>
                <li>Bring multiple outfit options if desired</li>
                <li>Think about any specific shots you want</li>
              </ul>
            </div>
            
            <p><strong>Please arrive 10-15 minutes early</strong> to ensure we can start on time.</p>
            
            <p>If you need to reschedule or cancel, please contact us immediately.</p>
          </div>
          <div class="footer">
            <p><strong>Photography Studio Team</strong></p>
            <p>📞 (555) 123-4567 | ✉️ contact@studiocom</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder email sent to ${appointment.customerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send reminder email:', error);
    return false;
  }
};

/**
 * Send appointment status update email
 * @param {Object} appointment - Appointment data
 * @param {Object} service - Service data
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @returns {Promise}
 */
export const sendStatusUpdate = async (appointment, service, oldStatus, newStatus) => {
  const appointmentDate = new Date(appointment.appointmentDate);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const statusConfig = {
    CONFIRMED: {
      color: '#4CAF50',
      title: 'Appointment Confirmed',
      message: 'has been confirmed and is locked in!'
    },
    CANCELLED: {
      color: '#F44336',
      title: 'Appointment Cancelled',
      message: 'has been cancelled.'
    },
    COMPLETED: {
      color: '#2196F3',
      title: 'Appointment Completed',
      message: 'has been completed. Thank you for choosing us!'
    },
    NO_SHOW: {
      color: '#FF9800',
      title: 'Appointment Marked as No-Show',
      message: 'has been marked as a no-show.'
    }
  };

  const config = statusConfig[newStatus] || {
    color: '#666',
    title: 'Appointment Status Updated',
    message: 'status has been updated.'
  };

  const mailOptions = {
    from: `"Photography Studio" <${config.email.user}>`,
    to: appointment.customerEmail,
    subject: `${config.title} - Photography Studio`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${config.color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid ${config.color}; }
          .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          .status-badge { display: inline-block; padding: 8px 15px; background: ${config.color}; color: white; border-radius: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${newStatus === 'CONFIRMED' ? '✅' : newStatus === 'CANCELLED' ? '❌' : '📋'} ${config.title}</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${appointment.customerName}</strong>,</p>
            
            <p>Your appointment ${config.message}</p>
            
            <div class="details">
              <h3 style="margin-top: 0; color: ${config.color};">Appointment Details</h3>
              <p><strong>Service:</strong> ${service.name}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${appointment.appointmentTime}</p>
              <p><strong>Status:</strong> <span class="status-badge">${newStatus}</span></p>
            </div>

            ${newStatus === 'CANCELLED' ? `
              <div style="background: #FFEBEE; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #C62828;">We're Sorry to See You Go</h4>
                <p>If you'd like to reschedule or have any questions, please don't hesitate to contact us. We'd love to work with you in the future!</p>
              </div>
            ` : ''}

            ${newStatus === 'COMPLETED' ? `
              <div style="background: #E8F5E8; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #2E7D32;">What's Next?</h4>
                <p>Your photos will be processed and edited. We'll contact you when your gallery is ready for review (typically within 5-7 business days).</p>
              </div>
            ` : ''}

            ${newStatus === 'NO_SHOW' ? `
              <div style="background: #FFF3E0; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #EF6C00;">Important Notice</h4>
                <p>We noticed you weren't able to make your scheduled appointment. Please contact us to reschedule or discuss any concerns.</p>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p><strong>Photography Studio Team</strong></p>
            <p>📞 (555) 123-4567 | ✉️ contact@studiocom</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Status update email sent to ${appointment.customerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send status update email:', error);
    return false;
  }
};

/**
 * Send follow-up email after appointment completion
 * @param {Object} appointment - Appointment data
 * @param {Object} service - Service data
 * @returns {Promise}
 */
export const sendFollowUpEmail = async (appointment, service) => {
  const mailOptions = {
    from: `"Photography Studio" <${config.email.user}>`,
    to: appointment.customerEmail,
    subject: 'Follow-up: How was your experience?',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌟 Follow-up</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${appointment.customerName}</strong>,</p>
            
            <p>We hope you enjoyed your ${service.name} session with us!</p>
            
            <p>Your photos are currently being edited and we're working hard to make them perfect. You can expect to receive your gallery within 5-7 business days.</p>
            
            <p>In the meantime, we'd love to hear about your experience. Your feedback helps us improve our services.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="#" style="background: #9C27B0; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Share Your Feedback
              </a>
            </div>
            
            <p>Thank you for choosing our studio. We appreciate your trust in us to capture your special moments!</p>
          </div>
          <div class="footer">
            <p><strong>Photography Studio Team</strong></p>
            <p>📞 (555) 123-4567 | ✉️ contact@studiocom</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Follow-up email sent to ${appointment.customerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send follow-up email:', error);
    return false;
  }
};

export default transporter;