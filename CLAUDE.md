# Project Rules

## Gemini CLI Delegasyon Sistemi

Claude token maliyetini düşürmek için basit/rutin görevler Gemini CLI'ye delege edilir.
Gemini CLI: `/opt/homebrew/bin/gemini` (v0.27.2+)

### Çağrı Formatı

Doğrudan:
```bash
gemini -p "prompt buraya"
```

Wrapper ile (timeout + temiz çıktı):
```bash
bash /Users/altintasmert/Desktop/mbgadversimentv1/_bmad/tools/gemini-delegate.sh "prompt buraya"
```

### Görev Sınıflandırma Tablosu

| Görev Tipi | Nereye? | Örnekler |
|---|---|---|
| Dosya içeriği özetleme | Gemini | "Bu dosyayı özetle", "Ne yapıyor?" |
| Basit kod üretimi | Gemini | Boilerplate, CRUD, getter/setter |
| Regex/pattern yazma | Gemini | Regex oluşturma, glob pattern |
| Dokümantasyon taslağı | Gemini | README, JSDoc, comment blokları |
| Basit refactoring önerileri | Gemini | Rename, extract method |
| Veri format dönüşümleri | Gemini | JSON<>YAML, CSV parse |
| Dependency araştırma | Gemini | "Bu paket ne işe yarar?" |
| BMAD agent/workflow orkestrasyon | Claude | Workflow tasarımı, agent yapılandırma |
| Mimari kararlar | Claude | Sistem tasarımı, pattern seçimi |
| Güvenlik denetimi | Claude | Kod review, vulnerability analizi |
| Karmaşık bug analizi | Claude | Multi-file debug, race condition |
| Çoklu dosya refactoring | Claude | Cross-cutting concerns |
| Test stratejisi tasarımı | Claude | Test planı, coverage stratejisi |
| Kullanıcıyla interaktif karar | Claude | Seçenek sunma, onay alma |

### Delegasyon Kuralları

1. **Kullanıcı açıkça "Gemini'ye sor" derse** -> Doğrudan Gemini'ye delege et
2. **Tabloda "Gemini" olan basit görevler** -> Gemini'ye delege et, sonucu Claude'da işle
3. **Tabloda "Claude" olan görevler** -> Kesinlikle Claude'da kal
4. **Belirsiz durumlar** -> Claude'da kal (güvenli taraf)

### Gemini Çıktısını Kullanma

Gemini'den gelen çıktıyı doğrudan kullanıcıya sunma. Claude olarak:
- Çıktıyı doğrula
- Gerekirse düzelt/zenginleştir
- Bağlama uygun şekilde sun
