import { supabaseAdmin } from '../config/supabase.js';
import { getRazorpay, isRazorpayConfigured } from '../config/razorpay.js';
import crypto from 'crypto';

export async function listPayments(req, res) {
  try {
    const { gym_id, status, method, from, to, page = 1, limit = 50 } = req.query;
    const targetGym = gym_id || req.user.selected_gym_id;

    let query = supabaseAdmin
      .from('payments')
      .select('*, user:users!user_id(id, email), plan:membership_plans(name)')
      .order('payment_date', { ascending: false });

    if (targetGym) query = query.eq('gym_id', targetGym);
    if (status) query = query.eq('status', status);
    if (method) query = query.eq('method', method);
    if (from) query = query.gte('payment_date', from);
    if (to) query = query.lte('payment_date', to);

    const fromRecord = (page - 1) * limit;
    query = query.range(fromRecord, fromRecord + limit - 1);

    const { data: payments, error } = await query;
    if (error) throw error;

    const userIds = [...new Set(payments?.map(p => p.user_id).filter(Boolean) || [])];
    let profiles = [];
    if (userIds.length > 0) {
      const { data: p } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds);
      profiles = p || [];
    }
    const profileMap = {};
    profiles.forEach(prof => { profileMap[prof.user_id] = prof; });
    const result = (payments || []).map(item => ({
      ...item,
      profile: profileMap[item.user_id] || null,
    }));

    return res.json(result);
  } catch (err) {
    console.error('List payments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function myPayments(req, res) {
  try {
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('*, plan:membership_plans(name)')
      .eq('user_id', req.user.id)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    const totalPaid = payments?.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0) || 0;

    return res.json({ payments: payments || [], total_paid: totalPaid });
  } catch (err) {
    console.error('My payments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createPayment(req, res) {
  try {
    const { user_id, gym_id, membership_plan_id, amount, method, transaction_id } = req.validated.body;
    const targetGym = gym_id || req.user.selected_gym_id;

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: payment, error } = await supabaseAdmin.from('payments').insert({
      user_id,
      gym_id: targetGym,
      membership_plan_id,
      amount,
      method,
      transaction_id: transaction_id || null,
      status: 'completed',
      invoice_number: invoiceNumber,
      payment_date: new Date().toISOString(),
    }).select('*, user:users!user_id(id, email), plan:membership_plans(name)').single();

    if (error) return res.status(400).json({ error: error.message });

    const { data: profileData } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', payment.user_id)
      .single();
    payment.profile = profileData || null;

    if (membership_plan_id) {
      const { data: plan } = await supabaseAdmin.from('membership_plans').select('duration_days').eq('id', membership_plan_id).single();
      if (plan) {
        const { data: member } = await supabaseAdmin.from('members').select('id, end_date').eq('user_id', user_id).single();
        if (member) {
          const now = new Date();
          const currentEnd = member.end_date ? new Date(member.end_date) : now;
          const newStart = currentEnd > now ? currentEnd : now;
          const newEnd = new Date(newStart);
          newEnd.setDate(newEnd.getDate() + plan.duration_days);

          await supabaseAdmin.from('members').update({
            membership_plan_id,
            start_date: newStart.toISOString().split('T')[0],
            end_date: newEnd.toISOString().split('T')[0],
            status: 'active',
            updated_at: new Date().toISOString(),
          }).eq('id', member.id);
        }
      }
    }

    return res.status(201).json(payment);
  } catch (err) {
    console.error('Create payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createRazorpayOrder(req, res) {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(400).json({ error: 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' });
    }

    const { membership_plan_id } = req.body;

    if (!membership_plan_id) {
      return res.status(400).json({ error: 'Membership plan ID is required' });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from('membership_plans')
      .select('*')
      .eq('id', membership_plan_id)
      .single();

    if (planError) return res.status(404).json({ error: 'Plan not found' });

    const amountInPaise = Math.round(Number(plan.price) * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        user_id: req.user.id,
        membership_plan_id,
        gym_id: req.user.selected_gym_id,
      },
    };

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create(options);

    await supabaseAdmin.from('payments').insert({
      user_id: req.user.id,
      gym_id: req.user.selected_gym_id,
      membership_plan_id,
      amount: plan.price,
      method: 'razorpay',
      razorpay_order_id: order.id,
      status: 'pending',
      invoice_number: `INV-${Date.now()}`,
    });

    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      plan_name: plan.name,
      user_name: req.user.full_name || 'Member',
      email: req.user.email,
    });
  } catch (err) {
    console.error('Create Razorpay order error:', err);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
}

export async function verifyRazorpay(req, res) {
  try {
    const { order_id, payment_id, signature } = req.body;

    const body = order_id + '|' + payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id: payment_id,
        razorpay_signature: signature,
        status: 'completed',
        transaction_id: payment_id,
        payment_date: new Date().toISOString(),
      })
      .eq('razorpay_order_id', order_id)
      .select()
      .single();

    if (payment?.membership_plan_id) {
      const { data: plan } = await supabaseAdmin.from('membership_plans').select('duration_days').eq('id', payment.membership_plan_id).single();
      if (plan) {
        const { data: member } = await supabaseAdmin.from('members').select('id, end_date').eq('user_id', payment.user_id).single();
        if (member) {
          const now = new Date();
          const currentEnd = member.end_date ? new Date(member.end_date) : now;
          const newStart = currentEnd > now ? currentEnd : now;
          const newEnd = new Date(newStart);
          newEnd.setDate(newEnd.getDate() + plan.duration_days);

          await supabaseAdmin.from('members').update({
            membership_plan_id: payment.membership_plan_id,
            start_date: newStart.toISOString().split('T')[0],
            end_date: newEnd.toISOString().split('T')[0],
            status: 'active',
            updated_at: new Date().toISOString(),
          }).eq('id', member.id);
        }
      }
    }

    return res.json({ message: 'Payment verified successfully', payment });
  } catch (err) {
    console.error('Verify payment error:', err);
    return res.status(500).json({ error: 'Payment verification failed' });
  }
}

export async function paymentReport(req, res) {
  try {
    const { gym_id, from, to } = req.query;
    const targetGym = gym_id || req.user.selected_gym_id;

    let query = supabaseAdmin
      .from('payments')
      .select('*')
      .eq('status', 'completed');

    if (targetGym) query = query.eq('gym_id', targetGym);
    if (from) query = query.gte('payment_date', from);
    if (to) query = query.lte('payment_date', to);

    const { data: payments, error } = await query.order('payment_date', { ascending: true });
    if (error) throw error;

    const totalRevenue = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;

    const monthlyData = {};
    payments?.forEach((p) => {
      const month = new Date(p.payment_date).toISOString().substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + Number(p.amount);
    });

    const methodBreakdown = {};
    payments?.forEach((p) => {
      methodBreakdown[p.method] = (methodBreakdown[p.method] || 0) + Number(p.amount);
    });

    return res.json({
      total_revenue: totalRevenue,
      total_transactions: payments?.length || 0,
      monthly: Object.entries(monthlyData).map(([month, revenue]) => ({ month, revenue })),
      method_breakdown: Object.entries(methodBreakdown).map(([method, amount]) => ({ method, amount })),
    });
  } catch (err) {
    console.error('Payment report error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getInvoice(req, res) {
  try {
    const { id } = req.params;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('*, user:users!user_id(id, email), plan:membership_plans(name), gym:gyms(name, address, phone, email)')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Payment not found' });

    const { data: profileData } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', payment.user_id)
      .single();
    payment.profile = profileData || null;

    return res.json(payment);
  } catch (err) {
    console.error('Get invoice error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function downloadInvoice(req, res) {
  try {
    const { id } = req.params;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('*, user:users!inner(id, email, user_profiles(full_name)), gym:gyms!inner(name, address, city, state, phone)')
      .eq('id', id)
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const { default: PDFDocument } = await import('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment.invoice_number || id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('GymFlow', { align: 'center' });
    doc.fontSize(16).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Invoice #: ${payment.invoice_number || id}`);
    doc.text(`Date: ${new Date(payment.created_at).toLocaleDateString()}`);
    doc.text(`Status: ${payment.status}`);
    doc.moveDown();
    
    doc.fontSize(12).text('Bill To:');
    doc.fontSize(10);
    doc.text(payment.user?.user_profiles?.full_name || 'Member');
    doc.text(payment.user?.email);
    doc.moveDown();
    
    doc.fontSize(12).text('Gym:');
    doc.fontSize(10);
    doc.text(payment.gym?.name || '');
    doc.text(`${payment.gym?.address || ''}, ${payment.gym?.city || ''}`);
    doc.moveDown();
    
    doc.fontSize(12).text(`Amount: ₹${payment.amount}`);
    doc.text(`Payment Method: ${payment.method}`);
    doc.text(`Razorpay ID: ${payment.razorpay_order_id || 'N/A'}`);
    
    doc.end();
  } catch (err) {
    console.error('Download invoice error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
}