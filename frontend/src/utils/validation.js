import { z } from 'zod';

// User schemas
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email adresi gereklidir')
    .email('Geçerli bir email adresi giriniz'),
  password: z.string()
    .min(6, 'Şifre en az 6 karakter olmalıdır')
});

export const createUserSchema = z.object({
  email: z.string()
    .min(1, 'Email adresi gereklidir')
    .email('Geçerli bir email adresi giriniz'),
  password: z.string()
    .min(6, 'Şifre en az 6 karakter olmalıdır'),
  name: z.string()
    .min(2, 'İsim en az 2 karakter olmalıdır')
    .max(100, 'İsim en fazla 100 karakter olabilir'),
  role: z.enum(['SUPER_ADMIN', 'OPERATOR', 'PRINTER', 'FIELD'], {
    errorMap: () => ({ message: 'Geçerli bir rol seçiniz' })
  }),
  phone: z.string()
    .regex(/^[0-9]{10,11}$/, 'Geçerli bir telefon numarası giriniz (10-11 hane)')
    .optional()
    .or(z.literal(''))
});

// Pole schemas
export const createPoleSchema = z.object({
  latitude: z.number()
    .min(-90, 'Enlem -90 ile 90 arasında olmalıdır')
    .max(90, 'Enlem -90 ile 90 arasında olmalıdır'),
  longitude: z.number()
    .min(-180, 'Boylam -180 ile 180 arasında olmalıdır')
    .max(180, 'Boylam -180 ile 180 arasında olmalıdır'),
  city: z.string()
    .min(2, 'Şehir adı en az 2 karakter olmalıdır')
    .max(100, 'Şehir adı en fazla 100 karakter olabilir'),
  district: z.string()
    .min(2, 'İlçe adı en az 2 karakter olmalıdır')
    .max(100, 'İlçe adı en fazla 100 karakter olabilir'),
  neighborhood: z.string()
    .max(100, 'Mahalle adı en fazla 100 karakter olabilir')
    .optional()
    .or(z.literal('')),
  street: z.string()
    .max(100, 'Cadde adı en fazla 100 karakter olabilir')
    .optional()
    .or(z.literal('')),
  sequenceNo: z.number()
    .int('Sıra numarası tam sayı olmalıdır')
    .positive('Sıra numarası pozitif olmalıdır')
    .optional()
});

// Order schemas
export const createOrderSchema = z.object({
  poleId: z.string()
    .uuid('Geçerli bir direk ID\'si giriniz'),
  poleIds: z.array(z.string().uuid())
    .optional(),
  accountId: z.string()
    .uuid('Geçerli bir müşteri ID\'si giriniz'),
  clientName: z.string()
    .min(2, 'Müşteri adı en az 2 karakter olmalıdır')
    .max(200, 'Müşteri adı en fazla 200 karakter olabilir'),
  clientContact: z.string()
    .max(500, 'İletişim bilgisi en fazla 500 karakter olabilir')
    .optional()
    .or(z.literal('')),
  startDate: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsed >= today;
    }, { message: 'Başlangıç tarihi bugünden önce olamaz' }),
  endDate: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, { message: 'Geçerli bir bitiş tarihi giriniz' }),
  price: z.number()
    .positive('Fiyat pozitif olmalıdır')
    .optional()
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır',
  path: ['endDate']
});

export const updateOrderSchema = z.object({
  clientName: z.string()
    .min(2, 'Müşteri adı en az 2 karakter olmalıdır')
    .max(200, 'Müşteri adı en fazla 200 karakter olabilir')
    .optional(),
  clientContact: z.string()
    .max(500, 'İletişim bilgisi en fazla 500 karakter olabilir')
    .optional(),
  startDate: z.string()
    .optional(),
  endDate: z.string()
    .optional(),
  price: z.number()
    .positive('Fiyat pozitif olmalıdır')
    .optional()
});

// Account schemas
export const createAccountSchema = z.object({
  companyName: z.string()
    .min(2, 'Şirket adı en az 2 karakter olmalıdır')
    .max(200, 'Şirket adı en fazla 200 karakter olabilir'),
  contactName: z.string()
    .min(2, 'Yetkili adı en az 2 karakter olmalıdır')
    .max(100, 'Yetkili adı en fazla 100 karakter olabilir'),
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^[0-9]{10,11}$/, 'Geçerli bir telefon numarası giriniz (10-11 hane)')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .max(500, 'Adres en fazla 500 karakter olabilir')
    .optional()
    .or(z.literal('')),
  taxNo: z.string()
    .max(50, 'Vergi numarası en fazla 50 karakter olabilir')
    .optional()
    .or(z.literal('')),
  taxOffice: z.string()
    .max(100, 'Vergi dairesi en fazla 100 karakter olabilir')
    .optional()
    .or(z.literal(''))
});

// Pricing schema
export const updatePricingSchema = z.object({
  printPrice: z.number()
    .positive('Baskı fiyatı pozitif olmalıdır'),
  mountPrice: z.number()
    .positive('Montaj fiyatı pozitif olmalıdır'),
  dismountPrice: z.number()
    .positive('Söküm fiyatı pozitif olmalıdır'),
  vatRate: z.number()
    .min(0, 'KDV oranı 0\'dan küçük olamaz')
    .max(100, 'KDV oranı 100\'den büyük olamaz')
});

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email adresi gereklidir')
    .email('Geçerli bir email adresi giriniz')
});

export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Token gereklidir'),
  newPassword: z.string()
    .min(6, 'Şifre en az 6 karakter olmalıdır')
    .max(100, 'Şifre en fazla 100 karakter olabilir')
});

// File upload schema
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 20 * 1024 * 1024, {
      message: 'Dosya boyutu 20MB\'dan küçük olmalıdır'
    })
    .refine((file) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      return allowedTypes.includes(file.type);
    }, {
      message: 'Sadece JPG, PNG, WebP ve PDF dosyaları yüklenebilir'
    })
});
