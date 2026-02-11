
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

// Config
const BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@pbms.com';
const ADMIN_PASS = 'admin123';

const log = (step, msg, data = '') => {
  console.log(`\n[${step}] ${msg}`);
  if (data) console.log('   ->', JSON.stringify(data).substring(0, 150) + (JSON.stringify(data).length > 150 ? '...' : ''));
};

const runTest = async () => {
  try {
    log('1', 'Authenticating Admin...');
    const authRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASS
    });
    const token = authRes.data.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    log('1', 'Success. Token acquired.');


    log('2', 'Creating New User (Field Staff)...');
    const randomUserStr = Math.floor(Math.random() * 10000);
    const userRes = await axios.post(`${BASE_URL}/users`, {
        email: `saha${randomUserStr}@pbms.com`,
        password: 'password123',
        name: `Saha Personel ${randomUserStr}`,
        role: 'FIELD',
        phone: '5551234567'
    }, authHeaders);
    const fieldUserId = userRes.data.data.user.id;
    log('2', `User Created: ${userRes.data.data.user.email} (ID: ${fieldUserId})`);


    log('3', 'Finding Available Pole...');
    const polesRes = await axios.get(`${BASE_URL}/poles`, authHeaders);
    const availablePole = polesRes.data.data.poles.find(p => p.status === 'AVAILABLE');
    if (!availablePole) throw new Error('No AVAILABLE poles found!');
    log('3', `Found Pole: ${availablePole.pole_code} (ID: ${availablePole.id})`);


    log('4', 'Creating Customer Account...');
    const accountRes = await axios.post(`${BASE_URL}/accounts`, {
       type: 'CORPORATE',
       company_name: `Test Holding ${randomUserStr}`,
       contact_name: 'Satın Alma Müdürü',
       email: `info@holding${randomUserStr}.com`,
       phone: '02120000000'
    }, authHeaders);
    const accountId = accountRes.data.data.account.id;
    log('4', `Account Created: ${accountRes.data.data.account.company_name} (ID: ${accountId})`);


    log('5', 'Creating Order...');
    const orderPrice = 10000;
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    
    const orderRes = await axios.post(`${BASE_URL}/orders`, {
        poleId: availablePole.id,
        accountId: accountId,
        clientName: `Test Campaign ${randomUserStr}`,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        price: orderPrice
    }, authHeaders);
    // orders array returned
    const orderId = orderRes.data.data.orders[0].id; // Format might be different if bulk
    log('5', `Order Created: ID ${orderId}`);


    log('6', 'Verifying Account Debt...');
    const accDetailRes = await axios.get(`${BASE_URL}/accounts/${accountId}`, authHeaders);
    const debt = accDetailRes.data.data.account.total_debt;
    const balance = accDetailRes.data.data.account.balance;
    log('6', `Account Debt: ${debt}, Balance: ${balance} (Expected: ${orderPrice})`);
    if(parseFloat(debt) !== orderPrice) console.warn('WARNING: Debt mismatch!');


    log('7', 'Testing PDF Generation...');
    try {
        const pdfRes = await axios.get(`${BASE_URL}/orders/${orderId}/pdf`, { ...authHeaders, responseType: 'stream' });
        log('7', `PDF Endpoint Status: ${pdfRes.status}`);
    } catch(e) { console.error('PDF Gen Failed', e.message); }


    log('8', 'Processing Order Flow (PENDING -> PRINTING -> AWAITING_MOUNT)...');
    await axios.patch(`${BASE_URL}/orders/${orderId}/status`, { newStatus: 'PRINTING' }, authHeaders);
    await axios.patch(`${BASE_URL}/orders/${orderId}/status`, { newStatus: 'AWAITING_MOUNT' }, authHeaders);
    log('8', 'Order is now AWAITING_MOUNT. Ready for Field.');


    log('9', 'Simulating Field Task (Upload Photo & Complete)...');
    // We need a dummy file
    const dummyPath = path.join(process.cwd(), 'dummy_proof.jpg');
    fs.writeFileSync(dummyPath, 'fake image content');
    
    const form = new FormData();
    form.append('image', fs.createReadStream(dummyPath));
    
    // Axios with FormData needs specific headers
    await axios.post(`${BASE_URL}/orders/${orderId}/upload/image`, form, {
        headers: {
            ...authHeaders.headers,
            ...form.getHeaders()
        }
    });
    log('9a', 'Photo Uploaded.');

    await axios.patch(`${BASE_URL}/orders/${orderId}/status`, { newStatus: 'LIVE' }, authHeaders);
    log('9b', 'Order set to LIVE.');


    log('10', 'Financials: Adding Partial Payment...');
    const paymentAmount = 4000;
    await axios.post(`${BASE_URL}/transactions`, {
        accountId: accountId,
        orderId: orderId,
        amount: paymentAmount,
        type: 'BANK_TRANSFER',
        description: 'Ön ödeme'
    }, authHeaders);
    log('10', `Payment of ${paymentAmount} added.`);


    log('11', 'Final Balance Check...');
    const finalAccRes = await axios.get(`${BASE_URL}/accounts/${accountId}`, authHeaders);
    const finalBalance = finalAccRes.data.data.account.balance;
    log('11', `Final Balance: ${finalBalance} (Expected: ${orderPrice - paymentAmount})`);
    
    if(parseFloat(finalBalance) === (orderPrice - paymentAmount)) {
        console.log('\n✅✅✅ E2E TEST SUCCESSFUL! ✅✅✅');
    } else {
        console.error('\n❌ Balance check failed!');
    }
    
    // Cleanup
    fs.unlinkSync(dummyPath);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if(error.response) console.error('Data:', JSON.stringify(error.response.data));
  }
};

runTest();
