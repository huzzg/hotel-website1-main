const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');
const userController = require('../controllers/userController');

// ========== LOGIN ==========
router.get('/login', (req, res) => {
  res.render('login', { title: 'Đăng nhập', error: null, identifier: '' });
});

router.post('/login', async (req, res, next) => {
  try {
    const identifier = (req.body.identifier || '').trim();
    const password = (req.body.password || '').trim();

    if (!identifier || !password) {
      return res.status(400).render('login', {
        title: 'Đăng nhập',
        error: 'Vui lòng nhập đầy đủ thông tin',
        identifier
      });
    }

    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { username: identifier };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(400).render('login', {
        title: 'Đăng nhập',
        error: 'Email hoặc tên đăng nhập không tồn tại',
        identifier
      });
    }

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) {
      return res.status(400).render('login', {
        title: 'Đăng nhập',
        error: 'Mật khẩu không đúng',
        identifier
      });
    }

    // 🔒 Kiểm tra tài khoản bị khóa
if (user.isBlocked) {
  return res.status(403).render('error', {
    message: 'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ quản trị viên.'
  });
}


    // 🔹 Reset session cũ để tránh giữ thông tin người dùng trước
    req.session.regenerate((err) => {
      if (err) {
        console.error('❌ Lỗi reset session:', err);
        return res.redirect('/auth/login');
      }

      // 🔹 Lưu thông tin user mới vào session
      req.session.user = {
  id: String(user._id),
  _id: user._id,
  username: user.username,
  role: user.role || 'user',
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  profile: user.profile
};

      req.session.save(() => {
        res.locals.currentUser = req.session.user;
        res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/');
      });
    });
  } catch (err) {
    console.error('❌ Lỗi đăng nhập:', err);
    res.status(500).send('Lỗi đăng nhập.');
  }
});

// ========== REGISTER ==========
router.get('/register', (req, res) => {
  res.render('register', { title: 'Đăng ký', error: null });
});

// ✅ Đăng ký kèm upload avatar và xác nhận mật khẩu
router.post(
  '/register',
  userController.upload.single('avatar'),
  async (req, res, next) => {
    try {
      const { name, cccd, email, phone, password, confirmPassword } = req.body;

      if (!name || !email || !password || !confirmPassword) {
        return res.render('register', { title: 'Đăng ký', error: '❌ Vui lòng nhập đầy đủ thông tin!' });
      }

      if (password !== confirmPassword) {
        return res.render('register', { title: 'Đăng ký', error: '❌ Mật khẩu xác nhận không khớp!' });
      }

      const existed = await User.findOne({ email });
      if (existed) {
        return res.render('register', { title: 'Đăng ký', error: '❌ Email đã tồn tại!' });
      }

      const hash = await bcrypt.hash(password, 10);
      const username = email.split('@')[0];

      const newUser = new User({
        username,
        email,
        phone,
        password: hash,
        role: 'user',
        active: true,
        profile: { name, cccd },
        avatar: req.file ? '/uploads/avatars/' + req.file.filename : ''
      });

      await newUser.save();

      req.session.user = {
  id: String(newUser._id),
  _id: newUser._id,
  username: newUser.username,
  role: 'user',
  email: newUser.email,
  phone: newUser.phone,
  avatar: newUser.avatar,
  profile: newUser.profile
};

      req.session.save(() => res.redirect('/'));
    } catch (err) {
      console.error(err);
      res.render('register', { title: 'Đăng ký', error: '❌ Lỗi khi đăng ký người dùng!' });
    }
  }
);

// ========== LOGOUT ==========
router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) console.error('❌ Lỗi khi xoá session:', err);
      res.clearCookie('connect.sid', { path: '/' });
      res.clearCookie('token', { path: '/' });
      return res.redirect('/auth/login');
    });
  } else {
    res.clearCookie('connect.sid', { path: '/' });
    res.redirect('/auth/login');
  }
});

// ========== QUÊN MẬT KHẨU ==========
router.get('/forgot-password', (req, res) =>
  res.render('forgot-password', { step: 1, email: null, message: null })
);

router.post('/forgot-password', userController.handleForgotPassword);
router.post('/forgot-password/reset', userController.handleResetPassword);

module.exports = router;
