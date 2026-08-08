const DOCUMENT_TYPES = {
  DRIVER_LICENSE: 'driver_license',
  SRC: 'src',
  VEHICLE_REGISTRATION: 'vehicle_registration',
  INSURANCE: 'insurance',
};

const DOCUMENT_TYPE_LABELS = {
  driver_license: 'Ehliyet',
  src: 'SRC Belgesi',
  vehicle_registration: 'Ruhsat',
  insurance: 'Sigorta',
};

const DRIVER_DOCUMENT_TYPES = [
  DOCUMENT_TYPES.DRIVER_LICENSE,
  DOCUMENT_TYPES.SRC,
];

const VEHICLE_DOCUMENT_TYPES = [
  DOCUMENT_TYPES.VEHICLE_REGISTRATION,
  DOCUMENT_TYPES.INSURANCE,
];

const OWNER_TYPES = {
  DRIVER_PROFILE: 'driver_profile',
  VEHICLE_PROFILE: 'vehicle_profile',
};

// target_type, owner_type ile aynı değer setini kullanır (DRY)
const TARGET_TYPES = OWNER_TYPES;

const TARGET_TYPE_LABELS = {
  driver_profile: 'Şoför',
  vehicle_profile: 'Araç',
};

// OTP kod üretimi
const OTP_CODE_LENGTH = 8;
// Karışan karakterler çıkarıldı: 0/O, 1/I yok
const OTP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const OTP_EXPIRY_MINUTES = 10;

const CONNECTION_REQUEST_STATUSES = {
  PENDING: 'pending',
  CONSUMED: 'consumed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

// company_users içinde OTP üretebilecek yönetim rolleri
const MANAGER_ROLE_NAMES = ['company_admin', 'company_moderator'];

// Sadece admin — kurum-kurum iş birliği kararları için
const ADMIN_ROLE_NAMES = ['company_admin'];

// Kurum-kurum davet süresi (24 saat = 1440 dakika)
const PARTNERSHIP_INVITATION_EXPIRY_MINUTES = 1440;

// Belge süresi hatırlatma eşikleri (gün) — küçükten büyüğe
// scanDocumentExpiries, kalan gün sayısına bakıp bunlardan en küçük uyanı seçer
const DOC_EXPIRY_THRESHOLDS_DAYS = [7, 10, 20, 30];

const NOTIFICATION_TYPES = {
  DOC_EXPIRING: 'doc_expiring',
  DOC_EXPIRED:  'doc_expired',
};

const CONTRACT_TYPES = {
  DRIVER:              'driver',
  VEHICLE_OWNER:       'vehicle_owner',
  DRIVER_KVKK:         'driver_kvkk',
  VEHICLE_OWNER_KVKK:  'vehicle_owner_kvkk',
  PARTNERSHIP:         'partnership',
};

const CONTRACT_TYPE_LABELS = {
  driver:             'Şoför Sözleşmesi',
  vehicle_owner:      'Araç Sahibi Sözleşmesi',
  driver_kvkk:        'Şoför KVKK Aydınlatma Metni',
  vehicle_owner_kvkk: 'Araç Sahibi KVKK Aydınlatma Metni',
  partnership:        'İş Ortaklığı Sözleşmesi',
};

// Redeem akışında hangi tür için hangi çift kullanılır
const CONTRACT_PAIR_BY_TARGET = {
  driver_profile:  { contract: 'driver',        kvkk: 'driver_kvkk' },
  vehicle_profile: { contract: 'vehicle_owner', kvkk: 'vehicle_owner_kvkk' },
};

// Kurum kendi metnini kaydetmediyse gösterilecek fallback metinler
const DEFAULT_CONTRACT_TEMPLATES = {
  driver: {
    title: 'Şoför Hizmet Sözleşmesi',
    content:
`Bu belge, ilgili kurum ile filoya katılan şoför arasındaki hizmet ilişkisinin genel esaslarını düzenler.

1. TARAFLAR
Bu sözleşme, aşağıda "Kurum" olarak anılan hizmet kuruluşu ile "Şoför" olarak anılan gerçek kişi arasında elektronik ortamda kurulur.

2. HİZMETİN KAPSAMI
Şoför, sahip olduğu ehliyet ve SRC belgelerinin geçerlilik süreleri boyunca kurumun operasyonel filosunda görev almayı kabul eder.

3. BELGE YÜKÜMLÜLÜĞÜ
Şoför, ehliyet ve SRC belgelerinin geçerliliğini kesintisiz sürdürmeyi, süresi dolan belgeleri yenilendikten sonra en kısa sürede sisteme yüklemeyi taahhüt eder. Belgeleri geçersiz duruma düşen şoför, aktif operasyona alınmaz.

4. KİŞİSEL VERİLERİN İŞLENMESİ
Kurum, filo yönetimi ve operasyonel güvenlik amacıyla şoförün ad-soyad, T.C. kimlik numarası, telefon, doğum tarihi, ehliyet sınıfı ve yüklediği belgelere erişir. Bu veriler yalnızca ilgili mevzuat ve hizmet ilişkisi çerçevesinde işlenir, üçüncü taraflarla paylaşılmaz.

5. FESİH
Taraflar, bu sözleşmeyi diledikleri zaman tek taraflı olarak sona erdirebilir. Fesih halinde tarafların birbirlerine karşı hak ve yükümlülükleri saklıdır.

6. YÜRÜRLÜK
Bu sözleşme, şoförün elektronik ortamda kabul beyanı vermesiyle yürürlüğe girer ve fesih tarihine kadar geçerli kalır.`,
  },
  vehicle_owner: {
    title: 'Araç Sahibi Hizmet Sözleşmesi',
    content:
`Bu belge, ilgili kurum ile aracını filoya kaydettiren araç sahibi arasındaki hizmet ilişkisinin genel esaslarını düzenler.

1. TARAFLAR
Bu sözleşme, aşağıda "Kurum" olarak anılan hizmet kuruluşu ile "Araç Sahibi" olarak anılan gerçek/tüzel kişi arasında elektronik ortamda kurulur.

2. HİZMETİN KAPSAMI
Araç Sahibi, mülkiyetindeki aracın ruhsat ve sigorta belgelerinin geçerlilik süreleri boyunca kurumun operasyonel filosunda görev almasını kabul eder.

3. BELGE YÜKÜMLÜLÜĞÜ
Araç Sahibi, ruhsat ve sigorta belgelerinin geçerliliğini kesintisiz sürdürmeyi, süresi dolan belgeleri yenilendikten sonra en kısa sürede sisteme yüklemeyi taahhüt eder. Belgeleri geçersiz duruma düşen araç, aktif operasyona alınmaz.

4. FESİH
Taraflar, bu sözleşmeyi diledikleri zaman tek taraflı olarak sona erdirebilir. Fesih halinde tarafların birbirlerine karşı hak ve yükümlülükleri saklıdır.

5. YÜRÜRLÜK
Bu sözleşme, Araç Sahibi'nin elektronik ortamda kabul beyanı vermesiyle yürürlüğe girer ve fesih tarihine kadar geçerli kalır.`,
  },
  driver_kvkk: {
    title: 'Şoför KVKK Aydınlatma Metni',
    content:
`6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, kurumumuza filo şoförü olarak katılmanız halinde işlenecek kişisel verileriniz hakkında sizi bilgilendiririz.

1. VERİ SORUMLUSU
Filoya katıldığınız kurum, kişisel verileriniz için veri sorumlusu sıfatını taşır.

2. İŞLENEN VERİLER
Ad-soyad, T.C. kimlik numarası, telefon numarası, doğum tarihi, ehliyet sınıfı ve yüklediğiniz belgeler (ehliyet, SRC) ile bu belgelerin geçerlilik tarihleri.

3. İŞLEME AMACI
Filo yönetimi, operasyonel güvenlik, yasal yükümlülüklerin yerine getirilmesi ve belge geçerlilik sürelerinin takibi.

4. HUKUKİ SEBEP
Sözleşmenin kurulması ve ifası, yasal yükümlülük, meşru menfaat.

5. AKTARIM
Verileriniz, yasal zorunluluk halleri dışında üçüncü taraflarla paylaşılmaz. Kurum çalışanları arasında yalnızca ilgili görev sahiplerine erişim verilir.

6. HAKLARINIZ
KVKK madde 11 kapsamında verilerinize erişme, düzeltilmesini isteme, silinmesini isteme ve işlenmesine itiraz etme haklarına sahipsiniz. Bu haklarınızı kullanmak için kurumla iletişime geçebilirsiniz.

7. SAKLAMA SÜRESİ
Verileriniz, filo üyeliğiniz süresince ve ilgili mevzuatın öngördüğü asgari süreler boyunca saklanır.`,
  },
  partnership: {
    title: 'Kurumlar Arası İş Ortaklığı Sözleşmesi',
    content:
`Bu belge, hizmet sağlayıcı (kooperatif/taşeron) ile hizmet alan (okul/firma) kurum arasındaki ticari iş ortaklığının genel esaslarını düzenler.

1. TARAFLAR
Bu sözleşme, aşağıda "Hizmet Sağlayıcı" olarak anılan tüzel kişilik ile "Hizmet Alan" olarak anılan tüzel kişilik arasında elektronik ortamda kurulur.

2. İŞ ORTAKLIĞININ KAPSAMI
Taraflar, Hizmet Sağlayıcı'nın filosunda kayıtlı şoför ve araçlar aracılığıyla Hizmet Alan'ın belirlediği rota ve hizmetlerin yürütülmesi konusunda mutabık kalır.

3. FİLO SORUMLULUĞU
Hizmet Sağlayıcı, ortaklık süresi boyunca hizmete tahsis edilen şoför ve araçların belgelerinin güncel ve geçerli olmasından sorumludur. Herhangi bir belgenin süresinin dolması durumunda ilgili şoför/araç geçici olarak devre dışı bırakılır ve Hizmet Alan bilgilendirilir.

4. KİŞİSEL VERİ VE BİLGİ PAYLAŞIMI
Taraflar, ortaklık süresince erişim sağladıkları personel ve araç bilgilerini yalnızca operasyonel amaçlarla kullanır, ilgili mevzuat çerçevesinde işler ve saklar.

5. FİYATLANDIRMA VE ÖDEME
Hizmet bedelleri, rota atamaları ve dönemsel operasyonel şartlar taraflar arasında ayrıca belirlenir ve sisteme kayıt edilebilir.

6. FESİH
Taraflardan biri, karşı tarafa yazılı bildirimde bulunarak iş ortaklığını sona erdirebilir. Fesih halinde tarafların birbirlerine karşı doğmuş hak ve yükümlülükleri saklıdır.

7. UYUŞMAZLIK ÇÖZÜMÜ
Sözleşmeden doğabilecek uyuşmazlıklarda taraflar öncelikle sulh yolu ile anlaşmaya çalışır; anlaşma sağlanamaması halinde yetkili yargı mercileri esas alınır.

8. YÜRÜRLÜK
Bu sözleşme, davet edilen tarafın elektronik ortamda kabul beyanı vermesiyle yürürlüğe girer ve fesih tarihine kadar geçerli kalır.`,
  },
  vehicle_owner_kvkk: {
    title: 'Araç Sahibi KVKK Aydınlatma Metni',
    content:
`6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, aracınızı kurumumuz filosuna kaydettirmeniz halinde işlenecek verileriniz hakkında sizi bilgilendiririz.

1. VERİ SORUMLUSU
Aracınızı kaydettirdiğiniz kurum, verileriniz için veri sorumlusu sıfatını taşır.

2. İŞLENEN VERİLER
Aracınıza ilişkin plaka, marka, model, yıl, teknik özellikler, ruhsat ve sigorta bilgileri ile bu belgelerin geçerlilik tarihleri. Ayrıca sizinle iletişim için ad-soyad ve iletişim bilgileriniz.

3. İŞLEME AMACI
Filo yönetimi, operasyonel güvenlik, yasal yükümlülüklerin yerine getirilmesi ve belge geçerlilik sürelerinin takibi.

4. HUKUKİ SEBEP
Sözleşmenin kurulması ve ifası, yasal yükümlülük, meşru menfaat.

5. AKTARIM
Verileriniz, yasal zorunluluk halleri dışında üçüncü taraflarla paylaşılmaz.

6. HAKLARINIZ
KVKK madde 11 kapsamında verilerinize erişme, düzeltilmesini isteme, silinmesini isteme ve işlenmesine itiraz etme haklarına sahipsiniz.

7. SAKLAMA SÜRESİ
Verileriniz, araç filo üyeliğiniz süresince ve ilgili mevzuatın öngördüğü asgari süreler boyunca saklanır.`,
  },
};

const CONTRACT_TITLE_MAX = 200;
const CONTRACT_CONTENT_MAX = 20000;

module.exports = {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DRIVER_DOCUMENT_TYPES,
  VEHICLE_DOCUMENT_TYPES,
  OWNER_TYPES,
  TARGET_TYPES,
  TARGET_TYPE_LABELS,
  OTP_CODE_LENGTH,
  OTP_ALPHABET,
  OTP_EXPIRY_MINUTES,
  CONNECTION_REQUEST_STATUSES,
  MANAGER_ROLE_NAMES,
  ADMIN_ROLE_NAMES,
  PARTNERSHIP_INVITATION_EXPIRY_MINUTES,
  DOC_EXPIRY_THRESHOLDS_DAYS,
  NOTIFICATION_TYPES,
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  CONTRACT_PAIR_BY_TARGET,
  DEFAULT_CONTRACT_TEMPLATES,
  CONTRACT_TITLE_MAX,
  CONTRACT_CONTENT_MAX,
};
