# Zaryob Console Theme

[English](README.md) · **Türkçe**

Zaryob sitelerinin paylaştığı, terminal görünümlü ortak konsol arayüzü:
* **[zaryob.github.io](https://zaryob.github.io/)** (ana sayfa ve teknik yazılar)
* **[Kılavuzlar](https://zaryob.github.io/kilavuzlar/)** (kılavuzlar ve sistem yönetimi)
* **[Syscall Reference](https://zaryob.github.io/syscall/)** (Linux sistem çağrısı başvurusu)
* **[Execmap](https://zaryob.github.io/execmap/)** (ELF analizi ve tersine mühendislik)
* **[Pin Atlas](https://zaryob.github.io/pin-atlas/)** (etkileşimli geliştirme kartı ve çip pin rehberi)

## Genel bakış

Konsol teması bütün siteleri kehribar/VT100 tarzı eski terminal görünümünde birleştirir:
* **IBM Plex Mono:** kod, başlıklar, istemler ve veri tabloları.
* **IBM Plex Sans:** uzun metinler ve yazılar.
* **Terminal istemiyle gezinme:** `zaryob:~$` açılır proje seçicisi.
* **Açık / koyu tema:** Sistem, Koyu (`#171a1f` / `#e2b56f`) ve Açık (`#f5f3ed` / `#815310`).
* **İki dilli arayüz denetimleri:** İngilizce ve Türkçe (`i18n.js`).
* **Arama penceresi:** her yerde çalışan `/` kısayolu, Pagefind desteğiyle.

## Depo yapısı

```text
console-theme/
├── assets/console/           # Beş siteye bayt bayt aynı kopyalanır
│   ├── theme.css             # Ana konsol düzeni ve renk değişkenleri
│   ├── theme.js              # Tema seçici, arama penceresi, kod kopyalama düğmeleri, ?highlight=
│   ├── language.js           # Ortak tercih, URL ve depolama durumu
│   ├── i18n.js               # Ortak arayüz çeviri sözlüğü
│   ├── site.svg              # Temanın vektör simge seti
│   ├── regular.svg           # Dosya ve klasör simgeleri
│   ├── select-chevron.svg    # Form denetimlerinin açılır liste göstergesi
│   ├── ICONS-LICENSE.txt     # SVG dosyaları için Font Awesome Free atfı
│   └── fonts/                # IBM Plex Mono ve Sans web yazı tipleri, OFL.txt
├── _includes/                # Jekyll düzen bileşenleri (dört Jekyll sitesi)
│   ├── console-header.html   # Ortak terminal istemi başlığı
│   ├── console-icon.html     # SVG sprite yardımcısı
│   ├── console-content-language.html # Çeviri bildirim şeridi
│   ├── console-alternates.html       # SEO hreflang üreticisi (tr, en, x-default)
│   ├── console-suite.html            # Beş siteyi, yazarı ve feed'i bağlayan alt bilgi şeridi
│   ├── console-analytics.html        # Jekyll sitelerinin ortak Umami ve Google Analytics etiketleri
│   └── console/              # Dört include'un sync.py ile yenilenen kopyası
├── _data/                    # Kayıt verileri
│   ├── console_projects.json # Beş projenin kaydı
│   ├── writing_topics.yml    # Konu sınıflandırması
│   └── console/              # İki veri dosyasının sync.py ile yenilenen kopyası
├── artwork/                  # Paylaşım kartı ve ana sayfa görseli şablonları; `node artwork/make.cjs <klasör>` ile üretilir
├── scripts/
│   ├── sync.py               # Yukarıdaki dosyaları kardeş depolara kopyalar; --check doğrular
│   ├── check_i18n.py         # Sözlük doğrulaması (yinelenen anahtarlar, yer tutucular)
│   └── check_typography.cjs  # Yerel önizlemeye karşı tarayıcıda tipografi matrisi
├── tests/
│   ├── test_sync.py          # sync.py ve sözlük sözleşmesi (npm test)
│   └── theme.test.cjs        # Playwright regresyon testleri (npm run test:console)
├── .github/workflows/ci.yml  # check_i18n.py, npm test ve npm run test:console çalıştırır
├── package.json              # Playwright sürümünü sabitler; çalışma zamanı bağımlılığı yok
└── LICENSE                   # GPL-2.0-or-later
```

## Metin ve düzen ölçeği

`assets/console/theme.css`, beş sitenin tipografisi için asıl kaynaktır. Uygulama
stilleri piksel boyutları tanımlamak yerine buradaki değişkenleri kullanmalıdır:

* `--text-base`: gövde metni ve form alanları için `1rem`.
* `--text-prose`: yazılar ve kılavuzlar için `1.125rem`, `--line-prose: 1.8` ile.
* `--text-sm` / `--text-xs`: ikincil metin ve üst veriler için `.875rem` / `.8125rem`.
* `--text-h1` – `--text-h4`: ortak başlık hiyerarşisi.
* `--font-mono` / `--font-prose`: yerelde paketlenen IBM Plex Mono / Sans.

Giriş başlığı `--text-hero`, içerik başlığı `--text-h1` ölçeğini kullanır.
Uzun açıklamalarda `.console-prose`, kısa açıklamalarda ek olarak
`.console-prose--compact` kullanın. Bu roller açıkça seçilir; gezinme ve teknik
veriler mono kalır. `.console-meta` ikincil mono metin rolüdür.
Durum etiketleri `.console-badge` ve `console-badge--warning` gibi success,
warning, danger veya info varyantlarını kullanır. `--success-surface`,
`--warning-surface`, `--danger-surface` ve `--info-surface` opak zemin token'ları
temayla değişir; açık temadan alınmış sabit saydam renklerle değiştirilmemelidir.
Tarayıcı testleri açık, koyu ve sistem-koyu durumlarında metin kontrastını ölçer.

Bu değerler okurun tarayıcıdaki metin ayarına görelidir; olağan 16px varsayılanında
gövde metni 16px, uzun metin 18px olur. Mobil düzenler gövde veya kod metnini
küçültmek yerine yeniden akar. SVG pin etiketleri çizim koordinatlarını korur; harita
kendi panelinde kaydırılır. `--shell-width` ve `--gutter`, dış düzeni siteler arasında
hizalı tutar.

Sabitlenmiş tarayıcı araçlarını `npm ci` ile kurun (kurulu tarayıcı yoksa
`npx playwright install chromium` da gerekir). Beş siteyi derledikten sonra ana site
deposundaki `python3 scripts/preview_suite.py --port 4180` komutunu çalıştırın.
Playwright kurulu ve Node tarafından erişilebilirken:

```sh
npm run test:typography
```

Tarayıcı denetimi on beş sayfa türünü beş görünüm genişliğinde, varsayılan ve %200
metin boyutunda kapsar. Yüklenen yazı tiplerini, yazı ve form metninin okunabilirliğini,
JavaScript ve dosya hatalarını ve sayfa taşmasını denetler. Tablolar ve pin şemaları
kendi panellerinde kaydırılabilir. Başka bir önizleme adresi için `ZARYOB_PREVIEW_URL`,
sistemdeki Chromium için `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` değişkenini ayarlayın.

## Temayı dağıtma

Tek güncelleme yolu `scripts/sync.py` betiğidir. Ortak değişiklikleri bu depoda `main`
üzerinde yapın, sonra kardeş depolara kopyalayın (bu deponun yanında beklenirler:
`../zaryob.github.io`, `../kilavuzlar`, `../syscall`, `../pin-atlas`, `../execmap`;
her yol değiştirilebilir, bkz. `--help`):

```sh
python3 scripts/sync.py            # dosyaları, include'ları ve kaydı kopyalar
python3 scripts/sync.py --check    # salt okunur eşitlik denetimi; fark varsa 1 ile çıkar
```

İlk dosya yazılmadan önce bütün hedefler doğrulanır; eksik bir depo siteleri yarı
güncellenmiş bırakamaz. `--commit "mesaj"` ve `--auto-commit` ayrıca her kardeş depoda
commit oluşturur: yalnızca betiğin yazdığı dosyalar eklenir (hazırlanmış başka işler
olduğu gibi, commit edilmeden kalır) ve yalnızca bütün kardeş depolar `main`
dalındayken. Hiçbir şey push edilmez.

`--check`, bir hedefin `assets/console/` dizinindeki asıl kaynakta bulunmayan dosyaları
da reddeder. Oraya ait olan siteye özgü dosyalar `scripts/sync.py` içindeki
`ALLOWED_EXTRAS` listesinde hedef başına tanımlıdır (şu an ana sitede `bundle.scss` ve
`site.css`, Syscall'da `syscall.css`, Execmap'te `COPYING`); kopyalama kipi diğer fazla
dosyaları bildirir ve hiçbirini silmez.

Temayı yeni bir siteye eklemek için hedefi `scripts/sync.py` dosyasına ekleyip betiği
çalıştırın.

Siteler `git subtree` kullanmaz; eski `assets` dışa aktarma dalı kaldırılmıştır.

## Lisans

GPL-2.0-or-later (bkz. `LICENSE`). Yazı tipleri SIL Open Font License ile lisanslıdır (`assets/console/fonts/OFL.txt`). SVG simgeleri Font Awesome Free içerir, CC BY 4.0 (`assets/console/ICONS-LICENSE.txt`).

## Bütünleştirme ve dil sözleşmesi

Önce `python3 scripts/sync.py`, sonra `python3 scripts/sync.py --check` çalıştırın.
Denetimin geçmesi için yapılandırılmış beş hedefin hepsi mevcut olmalıdır. Dört Jekyll
sitesi dosyaları, include'ları ve kaydı alır. `assets/console/` altındaki her asıl
dosya, `theme.js` ve `site.svg` dahil, bütün hedeflerde bayt bayt aynıdır; siteye özel
dosya değişimi veya eşitlik istisnası yoktur ve orada izin verilen ek dosyalar yalnızca
`ALLOWED_EXTRAS` içindekilerdir. SVG atfı, yanındaki `ICONS-LICENSE.txt` dosyasını
gösterir. Sözlük bağdaştırıcısı yüklü değilken `theme.js` İngilizce kaynak etiketleri
(değişken yerleştirme dahil) kullanır; iki dilli siteler bu etiketleri kendi
bağdaştırıcılarıyla çevirir.

Paketleme farkları `scripts/sync.py` içinde açıkça yazılıdır: Jekyll siteleri
`assets/console/` veya `public/assets/console/`, `_includes/` ve `_data/` kullanır.
Execmap `public/assets/console/` kullanır ve bayt bayt aynı kaydı
`public/console-projects.json` olarak alır; Jekyll include'ları ve konu verisi almaz.
Oluşturulan başlık, yerel arama ve İngilizce dil politikası onun Node derlemesine
aittir; üretilen bu şablonlar Jekyll include'larının kopyası değildir. Derleme başlık,
açıklama, tam metin, URL, tür ve içerik dili içeren bir `search.json` üretir. Ortak
arama bu bağdaştırıcıyı Pagefind'ın yanında ve Pagefind kullanılamadığında sorgular;
her kaydın `lang` değerini (şu an `en`) korur. Execmap'in içeriği ve denetimleri, kayıtlı
Türkçe tercihte, Türkçe tarayıcı dilinde ve `?lang=tr` ile de İngilizce kalır.
`language.js` veya `i18n.js` yüklemez, dil seçici göstermez. Bu dosyalar eşitlik için
dağıtılır, kendiliğinden etkinleşmez. Bir tema eşitlemesi bu ürün politikasını
değiştirmemelidir.

İki dilli sitelerde `language.js`, sözlük bağdaştırıcısından (`i18n.js` veya Pin
Atlas'ın kendi `/i18n.js` dosyası) ve `theme.js` dosyasından önce yüklenir. Dil önceliği
şöyledir: desteklenen bir `?lang`, sonra kayıtlı tercih, sonra tarayıcının birincil dili
(Türkçe için TR, diğerleri için EN). Geçersiz kayıtlı değerler yok sayılır. İlk ikisi
açık bir seçimdir (`ZaryobLanguage.explicit`); tarayıcı dili yalnızca bir tahmindir.
Tahmin ortak denetimleri çevirir, başka bir şey yapmaz: başka bir sürüme yönlendirmez,
kaydedilmez, proje veya arama bağlantılarına eklenmez. Yalnızca açık bir seçim (dil
seçici, kayıtlı seçim veya `?lang=`) sayfanın kayıtlı alternatif sürümüne gider. İçerik
dili notu her durumda diğer sürümü önerir.

`<html lang>` her zaman sayfa içeriğinin dilini belirtir ve ortak betikler onu
değiştirmez (arayüz dili Pagefind'a tek bir eşzamanlı çağrı için bu öznitelik üzerinden
verilir ve içerik dili hemen geri yüklenir). Arayüz dili `<html>` üzerindeki
`data-ui-language` özniteliğiyle (ve `ZaryobLanguage.language` ile) sunulur; çevrilen
denetimler kendi `lang` değerlerini taşır. Arayüz diline ihtiyaç duyan site kodu ve
stilleri `document.documentElement.lang` yerine `data-ui-language` okumalıdır. Ortak
arama arayüz dilini izler.

İki bağdaştırıcı da `ZaryobLanguage`'a abonedir; depolama değişiklikleri açık sekmeleri
içerik gezinmesini zorlamadan günceller. Proje bağlantıları yalnızca açık bir dil
tercihini taşır, böylece depolama kapalıyken de çalışır. Her bağdaştırıcı kendi uygulama
sözlüğünün sahibidir. Yazı gövdeleri gerçek `lang` değerlerini korur; sürümler arası
gezinmeyi projenin baseurl değerinden bağımsız olarak mevcut alternatif bağlantılar
belirler. Sorgu ve parça durumu sürüm değişiminde korunur. İçerik zaten istenen
dildeyse sayfalama yerinde kalır. `console-alternates.html`, Türkçe sürümü (Türkçe
sürüm kayıtlı değilse sayfanın kendisini) gösteren `hreflang="x-default"` üretir.

Eşitlemeden önce asıl sözlüğü doğrulayın:

```sh
python3 scripts/check_i18n.py
node --test ../zaryob.github.io/scripts/test_i18n.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

`check_i18n.py` yinelenen anahtarları ve uyuşmayan yer tutucuları reddeder; eşitleme
kopyalamadan önce onu çalıştırır. `npm run check`, sözlük ve beş hedefli eşitlik
denetimlerini çalıştırır (kardeş depolar gerekir); `npm test` ise yalıtılmış eşitleme ve
onarım denetimlerini, beş hedefte dosya ve kayıt sapmasının reddini, eskimiş dosya ve
eksik hedef reddini, commit güvencelerini ve olumsuz sözlük örneklerini çalıştırır.
Ortak İngilizce yedek metinler, Türkçe bağdaştırıcı, açık seçimle gezinme, `<html lang>`
korunması, vurgulama ve arama sağlamlığına ilişkin tarayıcı regresyon testleri için
`npm run test:console` çalıştırın (kurulu Chromium gerekir).
`.github/workflows/ci.yml`, `main` dalına yapılan her push'ta ve pull request'lerde
`check_i18n.py`, `npm test` ve `npm run test:console` çalıştırır. Tipografi tarayıcı
regresyon matrisi artık execmap'i de kapsar (15 sayfa türü × 5 genişlik × 2 metin
boyutu). Bu komutların hiçbiri bir siteyi yayımlamaz.

Favicon politikası: Ana site ve Kılavuzlar ortak kökteki `/favicon.ico` dosyasını
kullanır; Pin Atlas ve Execmap kendi uygulama SVG simgelerini korur. Syscall,
tarayıcının köke dönen varsayılan favicon davranışını korur. Kılavuzlar'ın kök
başlıklarında site adı yinelenmez.
