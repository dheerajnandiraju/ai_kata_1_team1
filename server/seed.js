require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const InventoryItem = require('./models/InventoryItem');
const SupplyRequest = require('./models/SupplyRequest');

const seedData = async () => {
  try {
    await connectDB();

    // Clear all collections
    await User.deleteMany({});
    await InventoryItem.deleteMany({});
    await SupplyRequest.deleteMany({});
    console.log('All collections cleared');

    // Create users
    const admin = await User.create({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      name: 'Admin User',
    });
    console.log('Admin user created:', admin.username);

    const employee = await User.create({
      username: 'employee1',
      password: 'emp123',
      role: 'employee',
      name: 'John Doe',
    });
    console.log('Employee user created:', employee.username);

    // Create inventory items
    const inventoryItems = await InventoryItem.insertMany([
      { itemName: 'Pens', quantity: 500, description: 'Standard ballpoint pens' },
      { itemName: 'Notebooks', quantity: 200, description: 'Lined A4 notebooks' },
      { itemName: 'Staplers', quantity: 50, description: 'Desktop staplers' },
      { itemName: 'Printer Paper Ream', quantity: 100, description: 'A4 printer paper (500 sheets per ream)' },
      { itemName: 'Whiteboard Markers', quantity: 150, description: 'Assorted color whiteboard markers' },
      { itemName: 'USB Drives', quantity: 30, description: '16GB USB flash drives' },
    ]);
    console.log(`${inventoryItems.length} inventory items created`);

    console.log('\nSeed completed successfully');
  } catch (error) {
    console.error('Seed error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

seedData();
