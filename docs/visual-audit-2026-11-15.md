# Görsel tutarlılık düzeltmeleri — uygulama ve doğrulama

15 Kasım 2026. Başlangıç noktası, aynı dizindeki site denetimi ve sekiz düzeltme planıdır. Ortak tema önce değiştirildi; tüketiciler senkronizasyon betiğiyle güncellendi. Ardından her sitenin içerik ve görev düzeni ayrı commitlerle düzeltildi. Commitler yereldedir.

## Planlardan uygulamaya alınan kararlar

- Proje kaydında gerçek `key`, `title`, `title_en`, `path`, `prompt` şeması korundu. Wire’ın dağıtılan JSON dosyası kaldırılmadı; aynı canonical kaynaktan eşitleniyor ve derleme ikinci Wire kaydı eklemiyor.
- Giriş başlığı `--text-hero`, belge başlığı `--text-h1` kullanıyor. Belge H1’i 60 px yapılmadı. Mevcut `--font-prose` kullanıldı; genel `p`, `li`, `blockquote` seçicilerine font dayatılmadı.
- Gerçek `.console-hero__title`, `.guide-sidebar`, `.topbar` ve `.overview-grid` bileşenleri düzenlendi. Planlardaki örnek sınıf adları yeni, kullanılmayan bileşenler olarak eklenmedi.
- Wire iki sütuna, 704 px şema ile en az 320 px örnek alanı sığdığında geçiyor. Kılavuz TOC’u, içerik alanını daraltmamak için 1440 px altında başlığın devamında kapalı bir açılır bölüm oluyor.
- Syscall’ın gerçek `?arch=x64` ve `/arch/x64/` yolları korundu. Statik HTML ve JavaScript kapalı kullanım testleri geçiyor.
- Pin Atlas’ta genel firmware açıklaması katlandı; seçili pine ait devre uyarıları, güç koşulları, kaynaklar ve koşullu tolerans metinleri görünür kaldı.
- Ortak tema dosyalarında farklı SHA olduğu iddiası başlangıç incelemesiyle doğrulanmamıştı. Dağıtım, gerçek dosya eşitliği üzerinden kontrol edildi; siteye özel tema çatalları oluşturulmadı.

## Ortak tema — O-01–O-06

- **O-01:** Wire kayıt, senkronizasyon ve ortak arama kapsamına eklendi. Proje menüsü ve ortak altbilgi altı projeyi birer kez listeliyor. Wire ve Execmap arama sonuçları içerik dilini koruyor; bir dizin yüklenemezse diğer sonuçlar kullanılabiliyor.
- **O-02:** Mobil kimlik satırında proje yolu daralıyor, eylem düğmeleri yerini koruyor. Tam yol erişilebilir açıklama ve proje menüsünde kalıyor. Açılır menü kırpılmıyor; Enter, Escape ve odak dönüşü test edildi.
- **O-03:** Ayrı giriş/belge başlık rolleri kullanıldı. Execmap ve Wire giriş H1’i 1280 px görünümde 60 px olarak ölçüldü.
- **O-04:** Uzun açıklama, kısa açıklama ve metadata için kapsamı sınırlı roller tanımlandı. Kod, tablo, veri etiketleri ve kontroller mono kaldı. Dört durum rengi için açık/koyu temaya göre çözülen opak yüzeyler eklendi.
- **O-05:** Mevcut ortak aile altbilgisi kişisel site ve Wire’a da uygulandı. Siteye ait iletişim, lisans ve kaynak bağlantıları ayrı yerel bölümde bulunuyor.
- **O-06:** Kılavuzlar ve Wire giriş başlıkları ana içerik alanına taşındı; içeriğe geç hedefi başlığı kapsıyor.

## Kişisel site — H-01–H-04

- **H-01:** Belge sayfalarının başlığı ve alt başlığı içerikle aynı sol eksene alındı. Fotoğraflı makale kapağının kendi düzeni korundu.
- **H-02:** Projeler girişi kısa bir özete indirildi. Zaryob/9base ve özgün yazarlık açıklaması Türkçe ve İngilizce tarihsel çalışmalar bölümüne taşındı.
- **H-03:** Arşiv fotoğraflı başlığı kompaktlaştırıldı. Makale kapağının minimum yüksekliği görünüme göre 240–400 px arasında tanımlandı; başlık taşarsa büyüyebiliyor.
- **H-04:** Mobil terminalde ek biyografi komutları katmanından vazgeçildi; ana proje bağlantıları görünür kaldı. Wire terminale ve konu yollarına eklendi. Altbilgi sütunları büyütülmüş yazıda yeniden akıyor.

## Kılavuzlar — K-01–K-04

- **K-01:** Dizin, arşiv ve yardımcı bağlantılar mobilde tek açılır kontrolün altında. JavaScript kapalıyken dizin kullanılabilir.
- **K-02:** Görünür dosya yolu kaldırılıp GitHub kaynak eylemine taşındı; dizin girişleri “Genel bakış / Overview” olarak adlandırıldı. Üstte kısa, anlamsal konum bağlantısı var.
- **K-03:** 1440 px altındaki TOC kapalı açılır bölüm; yeterli masaüstü alanında 250 px yan sütun. Belge gövdesi TOC yüzünden dar bir şeride sıkışmıyor.
- **K-04:** Durum, gerçek inceleme tarihi ve kaynak eylemi başlığın devamında toplandı. Kapsam ve arşiv notları yerinde; kaynak eylemi satır içinde bölünmüyor.

## Execmap — E-01–E-04

- **E-01:** Giriş ortak hero, başlık, açıklama, eylem ve panel rollerini kullanıyor.
- **E-02:** Arama düğmesi “Search Execmap” adıyla kapsamını bildiriyor; ortak arama simgesi/boyutu ve System–Dark–Light sırası kullanılıyor.
- **E-03:** Makale bağlamı ve kaynak Markdown eylemi H1’in hemen devamında; açıklama bundan sonra geliyor. Belge başlığı ortak ölçekte. İnceleme tarihi bulunmayan içeriğe tarih üretilmedi.
- **E-04:** Bölüm bağlantısı betimleyici adını korurken başlığın erişilebilir adı bağlantı metnini tekrarlamıyor. Tarayıcı erişilebilirlik ağacında başlıklar tek kez okunan adla göründü.

## Syscall — S-01–S-04

- **S-01:** Temel arama ve iki sürüm/mimari kontrolü önde. Karşılaştırma, hex, uygulanmamış girdiler ve uzun sürüm/ABI notları açılır bölümde. URL’de etkin ileri filtre varsa bölüm açık geliyor; geri/ileri gezinmesi durumu koruyor.
- **S-02:** Yinelenen mimari listeleri tek listede toplandı. Her mimarinin etkileşimli ve HTML tablo bağlantısı var; JavaScript kapalıyken HTML bağlantıları sunuluyor.
- **S-03:** Kısa C bildirimi, yanında kopyalama düğmesi olan ortak kompakt kabuğu kullanıyor. Uzun kod kendi alanında kayıyor; düğme metnin üstünü örtmüyor. Gerçek bildirimin panoya kopyalanması test edildi.
- **S-04:** Uzun kaynak/snapshot sınırlamaları açılır bölümde; açıklamalar sans rolünde. LTS tarihinin ve bakım yaması sınırlamasının gerçek metni korundu.

## Pin Atlas — P-01–P-05

- **P-01:** Sabit, yarı saydam rozet renkleri ortak success/warning/info yüzeylerine bağlandı. Koşullu giriş ve analog uyarısı gerçek uygulamada açık ve koyu temada en az 4,5:1 metin kontrastı sağladı.
- **P-02:** Mobilde belgeler kapalı açılır bölüm; uyumluluk özeti daha kısa. Yinelenen konum/işlemci satırı dar görünümde yer kaplamıyor. Harita/tablo düğmelerinin erişilebilir adları ve 44 px hedefleri var; ilk pin ilk ekranda görünüyor.
- **P-03:** Genel elektrik/firmware açıklaması katlandı. Pin devresi, yapılandırma engeli ve elektrik tolerans koşulları kendi bağlamlarında görünür. Uyarı/kaynak verisi değiştirilmedi.
- **P-04:** Statik pin sayfaları ortak `--shell-width` dış eksenini kullanıyor; atlas bağlantıları belge bölümünden erişiliyor.
- **P-05:** Mobil istatistikler daha sıkı iki sütunda; sayı ve etiketler veri kaynağıyla aynı. Uzun giriş rozeti görsel olarak sadeleştirildi; katalog sayıları ve sürüm bilgisi yeniden uydurulmadı.

## Wire — W-01–W-05

- **W-01:** Dar araç çubuğunda kütüphane ve kılavuz eylemleri ayrı grid hücrelerinde, konum ikinci satırda. 320 px görünümde çakışma ve sayfa taşması yok.
- **W-02:** Çalışmayan EN seçicisi “İçerik: Türkçe” bilgisiyle değiştirildi. Ortak denetim sözlüğü yükleniyor; içerik için olmayan bir çeviri vaat edilmiyor.
- **W-03:** İki sütun 1280 px’den başlıyor; sol alan en az 704 px. Yatay kaydırma ipucu yalnız şema taşarken gösteriliyor. Alan bağlantıları, vurgulama ve klavye kaydırması korunuyor.
- **W-04:** Genel kütüphane eylemi amber; protokol katmanı renkleri veri şeması ve veri rozetlerinde. RFC bağlantıları ortak bağlantı renginde.
- **W-05:** Kılavuz 18 px sans, ortak satır aralığı ve sınırlı paragraf genişliği kullanıyor. Büyük metinde kartlar, başlıklar ve cetvel açıklaması yeniden akıyor.

## Doğrulama

- `console-theme`: 23 tarayıcı testi; dört senkronizasyon/sözlük testi; 388 sözlük anahtarı ve placeholder doğrulaması; altı depoda dosya eşitliği.
- Genel görünüm matrisi: 18 sayfa türü × 320/390/768/1181/1440 px × %100/%200 metin = **180 birleşim geçti**. Sayfa taşması, form/gövde boyutu, yüklenen yerel font, ana içerikte başlık, altı proje ve altbilgi bağlantıları kontrol ediliyor. Font beklemesi, stil çözümlemesinden sonra yapılıyor.
- `syscall`: 28 JavaScript, 48 Python ve 20 tarayıcı testi geçti. Statik/JavaScript kapalı kullanım, kopyalama, kaynak kimliği, geçmiş ve etkin filtre geri yükleme dahil.
- `execmap`: derleme, 20 test, yerel bağlantı ve kaynak dosyaları kontrolü geçti.
- `wire`: derleme ve 10 protokol/RFC/yerel bağlantı testi geçti. Güncel 15 protokolün verisine dokunulmadı.
- `pin-atlas`: 140 benzersiz arayüz senaryosu doğrulandı. İlk tam koşuda 139 geçti; kapalı belge bölümünü açması gereken test yeni akışa uyarlandı ve desktop/mobile projelerinde yeniden geçerek tamamlandı. 320/390 px ilk-pin konumu ve açık/koyu rozet kontrastı için regresyonlar eklendi.
- Altı sitede görev/giriş ekranları ayrıca koyu temada gözle kontrol edildi. E04 için tarayıcı erişilebilirlik ağacı incelendi; ayrı bir VoiceOver oturumu çalıştırılmadı.

### Ölçülen görünüm örnekleri

390 × 844 px görünümde ortak üst çubuk 69 px. Kılavuz CMake H1’i y=267,2 px; Syscall ilk veri satırı y=595,2 px; Pico 2’nin ilk pini y=548,2 px. Önceki raporda kılavuz H1’i y≈545, Syscall ilk satırı y≈918 idi. Wire IPv4’te 1280 px görünümde şema 704 px ve iç kaydırma genişliği de 704 px; iki sütun şemayı daraltmıyor.

Yeni görsel kanıtlar denetim dizininin `uygulama-sonrasi/` klasöründe: Pin Atlas, Kılavuzlar, Syscall ve Projeler mobil ekranları; Execmap/Wire masaüstü ekranları; Wire menüsü; `olcumler.json`. İlk 56 ekranlık rapor başlangıç kanıtı olarak duruyor.

## Uygulama commitleri

Her depo kendi Git geçmişine sahiptir. Ortak kaynak ve dağıtım commitleri ayrıdır. Aşağıdaki liste, uygulama öncesi HEAD’lerden bu raporun yazılmasına kadar olan commitleri içerir.

### console-theme

- `28536818ca51` — Add shared prose roles and accessible status surfaces
- `32c0a822fd0e` — Keep mobile project navigation on one line
- `91946711c439` — Include Wire in the canonical project and sync contracts
- `00d2f38d662e` — Search Wire alongside Pagefind and Execmap
- `a067983c2015` — Add a compact declaration layout with a separate copy action
- `624410b60fd7` — Preserve Wire license text in the adapter packaging contract
- `f9c2582f2892` — Let desktop header tools reflow with enlarged text
- `43999e8a5dd8` — Verify all six sites across 180 typography and shell combinations

### zaryob.github.io

- `1e52359509de` — Sync shared console layout, status roles and Wire integration
- `dead698fbbd7` — Sync shared header reflow for enlarged text
- `161dc9718892` — Unify home page framing, mobile preview and suite navigation
- `a51913ae6fab` — Shorten project introductions and keep provenance with historical work
- `936c60909155` — Include Wire in the combined local preview

### kilavuzlar

- `92c973e7f6ae` — Sync shared console layout, status roles and Wire integration
- `bc99ab1b950c` — Prioritize guide content and consolidate directory and article metadata
- `4ff3a220b84a` — Sync shared header reflow for enlarged text
- `ece25d397265` — Keep the source action together in article metadata

### syscall

- `e90b2b2064a1` — Sync shared console layout, status roles and Wire integration
- `4681a1908889` — Bring syscall results forward and simplify the reference controls
- `9fb5e746b621` — Sync shared header reflow for enlarged text

### pin-atlas

- `0ae68cdc620d` — Sync shared console layout, status roles and Wire integration
- `e35b3a0a08eb` — Use theme-aware readable electrical status badges
- `fda4fc3362d5` — Sync shared header reflow for enlarged text
- `daeff412bff5` — Bring mobile pin maps forward and fold secondary reference details

### execmap

- `8fef11dea191` — Sync shared console layout, status roles and Wire integration
- `649b08fb03f4` — Align Execmap hero and reading typography with the shared theme
- `d501cab2ba4b` — Put article context and source actions directly below the title
- `4c95c8b4509e` — Sync shared header reflow for enlarged text

### wire

- `ac56e8ebff04` — Sync shared console layout, status roles and Wire integration
- `c84081a2c028` — Use the shared Wire shell and separate mobile navigation actions
- `d9fb1d8038bc` — Keep protocol diagrams wide and explain horizontal scrolling
- `19960ed1364d` — Sync shared header reflow for enlarged text
- `0e317422c048` — Use the prose role and let protocol content reflow with enlarged text
