/**
 * Initial data for the Office Supply Management System
 * Contains users, inventory items, and request history
 */

const data = {
  // Predefined users with roles
  users: [
    {
      id: '1',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      name: 'Admin User'
    },
    {
      id: '2',
      username: 'employee1',
      password: 'emp123',
      role: 'employee',
      name: 'John Doe'
    },
    {
      id: '3',
      username: 'employee2',
      password: 'emp123',
      role: 'employee',
      name: 'Jane Smith'
    }
  ],

  // Office supply inventory
  inventory: [
    { id: '1', name: 'Pens (Blue)', quantity: 100, category: 'Writing' },
    { id: '2', name: 'Pens (Black)', quantity: 80, category: 'Writing' },
    { id: '3', name: 'Pencils', quantity: 150, category: 'Writing' },
    { id: '4', name: 'Notebooks (A4)', quantity: 50, category: 'Paper' },
    { id: '5', name: 'Sticky Notes', quantity: 200, category: 'Paper' },
    { id: '6', name: 'Staplers', quantity: 25, category: 'Equipment' },
    { id: '7', name: 'Staple Pins (Box)', quantity: 40, category: 'Equipment' },
    { id: '8', name: 'Paper Clips (Box)', quantity: 60, category: 'Equipment' },
    { id: '9', name: 'Folders', quantity: 100, category: 'Storage' },
    { id: '10', name: 'Binders', quantity: 30, category: 'Storage' },
    { id: '11', name: 'Whiteboard Markers', quantity: 45, category: 'Writing' },
    { id: '12', name: 'Scissors', quantity: 20, category: 'Equipment' }
  ],

  // Request history
  requests: [
    {
      id: '1',
      employeeId: '2',
      employeeName: 'John Doe',
      itemId: '1',
      itemName: 'Pens (Blue)',
      quantity: 5,
      remarks: 'For the new project team',
      status: 'approved',
      createdAt: '2026-04-18T10:30:00Z',
      processedAt: '2026-04-18T14:00:00Z',
      processedBy: 'Admin User',
      rejectionReason: null
    },
    {
      id: '2',
      employeeId: '3',
      employeeName: 'Jane Smith',
      itemId: '4',
      itemName: 'Notebooks (A4)',
      quantity: 10,
      remarks: 'Team meeting notes',
      status: 'rejected',
      createdAt: '2026-04-19T09:00:00Z',
      processedAt: '2026-04-19T11:30:00Z',
      processedBy: 'Admin User',
      rejectionReason: 'Quantity exceeds department limit'
    }
  ]
};

module.exports = data;
