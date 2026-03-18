import User from '../models/User.js';

const createAdminUser = async () => {
  try {
    const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!existing) {
      await User.create({
        email: process.env.ADMIN_EMAIL || 'admin@driftland.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin',
      });
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

export default createAdminUser;