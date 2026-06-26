export type City = {
  id: string
  name: string
  country: string
  lat: number
  lng: number
  /** Aladhan calculation method best suited for the region */
  method: number
}

// Curated list of major cities with coordinates (coordinate-based for accuracy + qibla)
export const CITIES: City[] = [
  { id: 'makkah', name: 'مكة المكرمة', country: 'السعودية', lat: 21.4225, lng: 39.8262, method: 4 },
  { id: 'madinah', name: 'المدينة المنورة', country: 'السعودية', lat: 24.4686, lng: 39.6142, method: 4 },
  { id: 'riyadh', name: 'الرياض', country: 'السعودية', lat: 24.7136, lng: 46.6753, method: 4 },
  { id: 'jeddah', name: 'جدة', country: 'السعودية', lat: 21.4858, lng: 39.1925, method: 4 },
  { id: 'dammam', name: 'الدمام', country: 'السعودية', lat: 26.4207, lng: 50.0888, method: 4 },
  { id: 'abha', name: 'أبها', country: 'السعودية', lat: 18.2164, lng: 42.5053, method: 4 },
  { id: 'tabuk', name: 'تبوك', country: 'السعودية', lat: 28.3838, lng: 36.5550, method: 4 },
  { id: 'dubai', name: 'دبي', country: 'الإمارات', lat: 25.2048, lng: 55.2708, method: 8 },
  { id: 'abudhabi', name: 'أبوظبي', country: 'الإمارات', lat: 24.4539, lng: 54.3773, method: 8 },
  { id: 'doha', name: 'الدوحة', country: 'قطر', lat: 25.2854, lng: 51.5310, method: 10 },
  { id: 'kuwait', name: 'الكويت', country: 'الكويت', lat: 29.3759, lng: 47.9774, method: 9 },
  { id: 'manama', name: 'المنامة', country: 'البحرين', lat: 26.2285, lng: 50.5860, method: 8 },
  { id: 'muscat', name: 'مسقط', country: 'عُمان', lat: 23.5880, lng: 58.3829, method: 8 },
  { id: 'sanaa', name: 'صنعاء', country: 'اليمن', lat: 15.3694, lng: 44.1910, method: 4 },
  { id: 'cairo', name: 'القاهرة', country: 'مصر', lat: 30.0444, lng: 31.2357, method: 5 },
  { id: 'alexandria', name: 'الإسكندرية', country: 'مصر', lat: 31.2001, lng: 29.9187, method: 5 },
  { id: 'amman', name: 'عمّان', country: 'الأردن', lat: 31.9454, lng: 35.9284, method: 3 },
  { id: 'jerusalem', name: 'القدس', country: 'فلسطين', lat: 31.7683, lng: 35.2137, method: 3 },
  { id: 'gaza', name: 'غزة', country: 'فلسطين', lat: 31.5018, lng: 34.4663, method: 3 },
  { id: 'beirut', name: 'بيروت', country: 'لبنان', lat: 33.8938, lng: 35.5018, method: 3 },
  { id: 'damascus', name: 'دمشق', country: 'سوريا', lat: 33.5138, lng: 36.2765, method: 3 },
  { id: 'baghdad', name: 'بغداد', country: 'العراق', lat: 33.3152, lng: 44.3661, method: 3 },
  { id: 'khartoum', name: 'الخرطوم', country: 'السودان', lat: 15.5007, lng: 32.5599, method: 5 },
  { id: 'tripoli', name: 'طرابلس', country: 'ليبيا', lat: 32.8872, lng: 13.1913, method: 5 },
  { id: 'tunis', name: 'تونس', country: 'تونس', lat: 36.8065, lng: 10.1815, method: 3 },
  { id: 'algiers', name: 'الجزائر', country: 'الجزائر', lat: 36.7538, lng: 3.0588, method: 3 },
  { id: 'casablanca', name: 'الدار البيضاء', country: 'المغرب', lat: 33.5731, lng: -7.5898, method: 3 },
  { id: 'rabat', name: 'الرباط', country: 'المغرب', lat: 34.0209, lng: -6.8416, method: 3 },
  { id: 'nouakchott', name: 'نواكشوط', country: 'موريتانيا', lat: 18.0735, lng: -15.9582, method: 3 },
  { id: 'istanbul', name: 'إسطنبول', country: 'تركيا', lat: 41.0082, lng: 28.9784, method: 13 },
  { id: 'ankara', name: 'أنقرة', country: 'تركيا', lat: 39.9334, lng: 32.8597, method: 13 },
  { id: 'tehran', name: 'طهران', country: 'إيران', lat: 35.6892, lng: 51.3890, method: 7 },
  { id: 'karachi', name: 'كراتشي', country: 'باكستان', lat: 24.8607, lng: 67.0011, method: 1 },
  { id: 'islamabad', name: 'إسلام آباد', country: 'باكستان', lat: 33.6844, lng: 73.0479, method: 1 },
  { id: 'jakarta', name: 'جاكرتا', country: 'إندونيسيا', lat: -6.2088, lng: 106.8456, method: 11 },
  { id: 'kualalumpur', name: 'كوالالمبور', country: 'ماليزيا', lat: 3.1390, lng: 101.6869, method: 11 },
  { id: 'london', name: 'لندن', country: 'بريطانيا', lat: 51.5074, lng: -0.1278, method: 3 },
  { id: 'paris', name: 'باريس', country: 'فرنسا', lat: 48.8566, lng: 2.3522, method: 12 },
  { id: 'berlin', name: 'برلين', country: 'ألمانيا', lat: 52.5200, lng: 13.4050, method: 3 },
  { id: 'newyork', name: 'نيويورك', country: 'أمريكا', lat: 40.7128, lng: -74.0060, method: 2 },
  { id: 'toronto', name: 'تورنتو', country: 'كندا', lat: 43.6532, lng: -79.3832, method: 2 },
]

export const DEFAULT_CITY: City = CITIES[0]
