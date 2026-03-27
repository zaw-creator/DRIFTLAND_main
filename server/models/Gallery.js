import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema(
  {
    src:      { type: String, required: true },
    publicId: { type: String, required: true },
    title:    { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Events', 'Cars', 'Track', 'Other'],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Gallery', gallerySchema);
