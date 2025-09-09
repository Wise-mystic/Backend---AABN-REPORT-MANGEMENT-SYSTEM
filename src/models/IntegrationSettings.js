import mongoose from 'mongoose';

const integrationSettingsSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    slackWebhookUrl: { type: String },
    emailFrom: { type: String },
    reportEmail: { type: String },
    calendarEnabled: { type: Boolean, default: true },
    google: {
      access_token: { type: String },
      refresh_token: { type: String },
      expiry_date: { type: Number },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

integrationSettingsSchema.index({ user_id: 1, workspace_id: 1 }, { unique: true });

export default mongoose.model('IntegrationSettings', integrationSettingsSchema);


