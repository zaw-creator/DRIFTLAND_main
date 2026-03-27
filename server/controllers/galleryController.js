import Gallery from '../models/Gallery.js';
import cloudinary from '../utils/cloudinaryConfig.js';

export const getGallery = async (req, res) => {
  try {
    const items = await Gallery.find().sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const uploadGalleryItem = async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    if (!title || !category) {
      return res.status(400).json({ success: false, error: 'Title and category are required' });
    }
    const item = await Gallery.create({
      src:      req.file.path,
      publicId: req.file.filename,
      title,
      category,
    });
    res.status(201).json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    await cloudinary.uploader.destroy(item.publicId);
    await item.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
