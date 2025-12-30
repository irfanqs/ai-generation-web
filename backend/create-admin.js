const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Admin';

  try {
    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('❌ User dengan email ini sudah ada!');
      
      // Update to admin if not already
      if (!existing.isAdmin) {
        await prisma.user.update({
          where: { email },
          data: { isAdmin: true },
        });
        console.log('✅ User berhasil diupdate menjadi admin!');
      } else {
        console.log('ℹ️  User ini sudah admin');
      }
      
      return;
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        isAdmin: true,
        credits: 10000, // Give admin lots of credits
      },
    });

    console.log('✅ Admin berhasil dibuat!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', admin.name);
    console.log('💰 Credits:', admin.credits);
    console.log('\n⚠️  Simpan kredensial ini dengan aman!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
