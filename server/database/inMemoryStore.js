import bcryptjs from 'bcryptjs';

/**
 * Stateful Demo & Development Memory Repository
 * Used exclusively when APP_MODE is 'demo' or 'development' and Supabase is unavailable.
 */
class InMemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    const salt = bcryptjs.genSaltSync(10);
    this.users = [
      { id: 'u1', email: 'donor@donorsync.com', passwordHash: bcryptjs.hashSync('donor123', salt), role: 'Donor', name: 'John Doe', isActive: true, createdAt: new Date().toISOString() },
      { id: 'u2', email: 'receiver@donorsync.com', passwordHash: bcryptjs.hashSync('receiver123', salt), role: 'Receiver', name: 'Emily Watson', isActive: true, createdAt: new Date().toISOString() },
      { id: 'u3', email: 'bank@donorsync.com', passwordHash: bcryptjs.hashSync('bank123', salt), role: 'Blood Bank', name: 'City Central Blood Repository', isActive: true, createdAt: new Date().toISOString() },
      { id: 'u4', email: 'hospital@donorsync.com', passwordHash: bcryptjs.hashSync('hospital123', salt), role: 'Hospital', name: 'St. Jude General Hospital', isActive: true, createdAt: new Date().toISOString() },
      { id: 'u5', email: 'admin@donorsync.com', passwordHash: bcryptjs.hashSync('admin123', salt), role: 'Admin', name: 'Dr. Sarah Lin (Chief Officer)', isActive: true, createdAt: new Date().toISOString() }
    ];

    this.donorProfiles = [
      { id: 'u1', donorCode: 'DS-O-NEG-001', bloodGroup: 'O-', phone: '+1 555-0192', age: 29, weight: 68, gender: 'Male', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', latitude: 12.9716, longitude: 77.5946, searchRadiusKm: 25, isAvailable: true, lastDonationDate: '2026-04-10', activeRating: 4.8, totalDonations: 6 },
      { id: 'd2', donorCode: 'DS-A-POS-002', bloodGroup: 'A+', phone: '+1 555-0238', age: 34, weight: 72, gender: 'Male', city: 'Bengaluru', state: 'Karnataka', pincode: '560025', latitude: 12.9816, longitude: 77.6046, searchRadiusKm: 20, isAvailable: true, lastDonationDate: '2026-01-15', activeRating: 4.5, totalDonations: 4 },
      { id: 'd3', donorCode: 'DS-B-POS-003', bloodGroup: 'B+', phone: '+1 555-0811', age: 26, weight: 58, gender: 'Female', city: 'Bengaluru', state: 'Karnataka', pincode: '560002', latitude: 12.9616, longitude: 77.5846, searchRadiusKm: 15, isAvailable: true, lastDonationDate: '2026-05-01', activeRating: 4.9, totalDonations: 8 },
      { id: 'd4', donorCode: 'DS-O-NEG-004', bloodGroup: 'O-', phone: '+1 555-0321', age: 31, weight: 62, gender: 'Female', city: 'Bengaluru', state: 'Karnataka', pincode: '560004', latitude: 12.9516, longitude: 77.5746, searchRadiusKm: 30, isAvailable: true, lastDonationDate: '2025-11-20', activeRating: 4.9, totalDonations: 5 },
      { id: 'd5', donorCode: 'DS-AB-POS-005', bloodGroup: 'AB+', phone: '+1 555-0994', age: 40, weight: 80, gender: 'Male', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', latitude: 12.9916, longitude: 77.6146, searchRadiusKm: 15, isAvailable: false, lastDonationDate: '2026-02-28', activeRating: 4.7, totalDonations: 3 },
      { id: 'd6', donorCode: 'DS-O-POS-006', bloodGroup: 'O+', phone: '+1 555-0122', age: 24, weight: 54, gender: 'Female', city: 'Bengaluru', state: 'Karnataka', pincode: '560011', latitude: 12.9416, longitude: 77.5646, searchRadiusKm: 20, isAvailable: true, lastDonationDate: '2026-04-20', activeRating: 4.2, totalDonations: 2 },
      { id: 'd7', donorCode: 'DS-B-NEG-007', bloodGroup: 'B-', phone: '+1 555-0672', age: 28, weight: 65, gender: 'Male', city: 'Bengaluru', state: 'Karnataka', pincode: '560047', latitude: 12.9656, longitude: 77.6246, searchRadiusKm: 25, isAvailable: true, lastDonationDate: '2026-01-05', activeRating: 4.6, totalDonations: 7 }
    ];

    this.receiverProfiles = [
      { id: 'u2', phone: '+1 555-0177', defaultHospital: 'St. Jude General Hospital', city: 'Bengaluru', state: 'Karnataka', pincode: '560025', emergencyContact: '+1 555-0178' }
    ];

    this.hospitalProfiles = [
      { id: 'u4', hospitalName: 'St. Jude General Hospital', licenseNumber: 'HOSP-KA-8821', phone: '+1 555-0900', address: '124 Healthcare Avenue, Richmond Town', city: 'Bengaluru', state: 'Karnataka', pincode: '560025', latitude: 12.9736, longitude: 77.6111, isVerified: true }
    ];

    this.bloodBankProfiles = [
      { id: 'u3', bankName: 'City Central Blood Repository', licenseNumber: 'BB-KA-1029', phone: '+1 555-0444', address: '48 Medical Square, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', latitude: 12.9784, longitude: 77.6408, isVerified: true }
    ];

    this.bloodRequests = [
      {
        id: 'r1',
        createdBy: 'u4',
        patientName: 'Arthur Dent',
        bloodGroup: 'O-',
        unitsRequired: 3,
        unitsFulfilled: 0,
        urgency: 'Critical',
        status: 'MATCHING',
        hospital: 'St. Jude General Hospital',
        latitude: 12.9736,
        longitude: 77.6111,
        requiredTime: new Date(Date.now() + 7200000).toISOString(),
        notes: 'ICU Trauma resuscitation - immediate O- units needed',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: 'r2',
        createdBy: 'u2',
        patientName: 'Robert Watson',
        bloodGroup: 'A+',
        unitsRequired: 2,
        unitsFulfilled: 2,
        urgency: 'High',
        status: 'FULFILLED',
        hospital: 'St. Jude General Hospital',
        latitude: 12.9736,
        longitude: 77.6111,
        requiredTime: new Date(Date.now() - 86400000).toISOString(),
        notes: 'Scheduled cardiac surgery support',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    this.donorMatches = [
      {
        id: 'm1',
        requestId: 'r1',
        donorId: 'u1',
        status: 'ALERTED',
        distanceKm: 2.1,
        matchScore: 96,
        responseEtaMinutes: 15,
        createdAt: new Date(Date.now() - 1200000).toISOString(),
        updatedAt: new Date(Date.now() - 1200000).toISOString()
      }
    ];

    this.bloodInventory = [
      { id: 'inv-1', bankId: 'u3', bloodGroup: 'A+', availableUnits: 32, reservedUnits: 4, targetSafetyUnits: 40 },
      { id: 'inv-2', bankId: 'u3', bloodGroup: 'A-', availableUnits: 9, reservedUnits: 2, targetSafetyUnits: 15 },
      { id: 'inv-3', bankId: 'u3', bloodGroup: 'B+', availableUnits: 38, reservedUnits: 5, targetSafetyUnits: 35 },
      { id: 'inv-4', bankId: 'u3', bloodGroup: 'B-', availableUnits: 5, reservedUnits: 1, targetSafetyUnits: 12 },
      { id: 'inv-5', bankId: 'u3', bloodGroup: 'AB+', availableUnits: 18, reservedUnits: 2, targetSafetyUnits: 20 },
      { id: 'inv-6', bankId: 'u3', bloodGroup: 'AB-', availableUnits: 3, reservedUnits: 0, targetSafetyUnits: 8 },
      { id: 'inv-7', bankId: 'u3', bloodGroup: 'O+', availableUnits: 42, reservedUnits: 6, targetSafetyUnits: 55 },
      { id: 'inv-8', bankId: 'u3', bloodGroup: 'O-', availableUnits: 4, reservedUnits: 2, targetSafetyUnits: 25 }
    ];

    this.inventoryTransactions = [
      {
        id: 'tx1',
        inventoryId: 'inv-8',
        bankId: 'u3',
        bloodGroup: 'O-',
        transactionType: 'OUTFLOW_TRANSFUSION',
        units: -2,
        previousUnits: 6,
        newUnits: 4,
        reason: 'Emergency dispatch to St. Jude ICU',
        loggedBy: 'u3',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    this.expiryPackets = [
      { id: 'p1', bankId: 'u3', bloodGroup: 'O-', units: 1, expiryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], bankName: 'City Central Blood Repository', status: 'EXPIRING_SOON' },
      { id: 'p2', bankId: 'u3', bloodGroup: 'AB+', units: 2, expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], bankName: 'City Central Blood Repository', status: 'SAFE' },
      { id: 'p3', bankId: 'u3', bloodGroup: 'A+', units: 3, expiryDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], bankName: 'City Central Blood Repository', status: 'EXPIRING_SOON' },
      { id: 'p4', bankId: 'u3', bloodGroup: 'B-', units: 1, expiryDate: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0], bankName: 'City Central Blood Repository', status: 'SAFE' }
    ];

    this.notifications = [
      {
        id: 'n1',
        userId: 'u1',
        type: 'EMERGENCY_REQUEST',
        title: '🚨 Urgent O- Blood Required Nearby',
        message: 'St. Jude General Hospital requires 3 units of O- blood (2.1 km away). Your profile is a 96% match.',
        data: { requestId: 'r1', bloodGroup: 'O-', urgency: 'Critical', hospital: 'St. Jude General Hospital' },
        isRead: false,
        createdAt: new Date(Date.now() - 1200000).toISOString()
      },
      {
        id: 'n2',
        userId: 'u3',
        type: 'LOW_STOCK_ALERT',
        title: '⚠️ Critical Shortage Warning: O- Blood',
        message: 'O- stock is at 4 units (Target safety stock is 25 units). Initiate mobile drive replenishment.',
        data: { bloodGroup: 'O-', currentStock: 4, target: 25 },
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    this.notificationPreferences = [
      { userId: 'u1', emergencyAlerts: true, nearbyRequests: true, inventoryAlerts: false, pushEnabled: false },
      { userId: 'u2', emergencyAlerts: true, nearbyRequests: false, inventoryAlerts: false, pushEnabled: false },
      { userId: 'u3', emergencyAlerts: true, nearbyRequests: false, inventoryAlerts: true, pushEnabled: false },
      { userId: 'u4', emergencyAlerts: true, nearbyRequests: false, inventoryAlerts: true, pushEnabled: false },
      { userId: 'u5', emergencyAlerts: true, nearbyRequests: true, inventoryAlerts: true, pushEnabled: false }
    ];

    this.pushSubscriptions = [];

    this.auditLogs = [
      { id: 'l1', userEmail: 'admin@donorsync.com', action: 'Approved hospital registration: St. Jude General Hospital', severity: 'Info', ipAddress: '127.0.0.1', metadata: {}, createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'l2', userEmail: 'bank@donorsync.com', action: 'Dispatched 2 units of O- blood to St. Jude Emergency ICU', severity: 'High', ipAddress: '127.0.0.1', metadata: {}, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'l3', userEmail: 'hospital@donorsync.com', action: 'Created Critical Emergency Request for Arthur Dent (3 units of O-)', severity: 'Critical', ipAddress: '127.0.0.1', metadata: {}, createdAt: new Date(Date.now() - 1800000).toISOString() }
    ];
  }
}

export const inMemoryStore = new InMemoryStore();
