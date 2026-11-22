# Hồ Sơ Vụ Án (web game phá án)

Web game giải đố phá án dạng "hồ sơ vụ án". Người chơi:
- đọc lời khai, xem manh mối và sơ đồ hiện trường;
- **thẩm vấn** nghi phạm và trình bằng chứng để vạch mâu thuẫn;
- ghim thẻ lên **bảng suy luận** rồi căng dây đỏ nối các chi tiết;
- có thể dùng **gợi ý 3 cấp** (bị trừ điểm);
- dùng **lưới loại trừ** (tab Sổ tay) để đánh dấu ✓/✗ từng nghi phạm theo các điều kiện tự đặt;
- cuối cùng nộp kết luận (mặc định 3 câu: hung thủ / động cơ / cách gây án; mỗi vụ có thể tự khai báo số câu) để được chấm điểm và xem lời giải.

Trang bìa có **kệ hồ sơ** liệt kê các vụ trong `cases/index.json`, mỗi vụ lưu tiến trình riêng.

## Ràng buộc công nghệ (bắt buộc giữ)

- HTML + CSS + JavaScript thuần (ES modules). **Không framework, không build tool, không npm dependency.**
- Nội dung vụ án chỉ nằm trong `cases/<id>.json`, cùng file bí mật `authoring/<id>.secret.json`. **Code không được hardcode nội dung vụ án** (tên, giờ giấc, đáp án, câu hỏi…).
- Hình ảnh: SVG flat vector, tông noir (xanh than `#1b2330`, be `#e9dfc8`, đỏ đô `#7a1f2b`).
- Lưu tiến trình bằng localStorage.
- Giao diện responsive, chơi được trên điện thoại (≥ 320px, không cuộn ngang trang).
- Comment trong code viết bằng tiếng Việt ở những chỗ quan trọng.

## Chạy

```bash
npx serve -l 3000 .          # hoặc: npm start
```
Mở http://localhost:3000. Không mở trực tiếp `index.html` bằng file://, vì khi đó `fetch` JSON sẽ lỗi. Chọn vụ án bằng kệ hồ sơ ở trang bìa, hoặc trực tiếp qua `?case=case-02`.

## Cấu trúc

```
index.html                 khung trang + <dialog id="modal"> dùng chung
css/style.css              style chia mục: 1 token · 2 nền · 3 nút · 4 intro · 5 hồ sơ · 6 modal · 7 tài liệu
                           · 8 nộp bài/kết quả · 10 thẩm vấn · 11 bảng suy luận · 12 gợi ý
                           · 13 kệ hồ sơ & lưới loại trừ · 9 responsive (cuối file)
js/main.js                 khởi động, state `app`, object `actions`, router theo hash
js/ui.js                   các màn chính + modal manh mối/nghi phạm (chỉ hiển thị; đổi state qua `actions`)
js/interrogation.js        màn thẩm vấn, trình bằng chứng, computeUnlocks()
js/board.js                bảng suy luận: kéo thả (Pointer Events), dây đỏ (SVG), zoom
js/hints.js                modal gợi ý 3 cấp
js/timed.js                chế độ có đồng hồ: tab Điều tra, đồng hồ lượt, computeTimed() (tính lại manh mối từ nhật ký hỏi)
js/accuse.js               chế độ có đồng hồ: màn buộc tội kèm chứng minh, gradeAccusation(), màn kết cục
js/modal.js                openModal / closeModal / confirmDialog
js/selectors.js            allClues(), findClue(), clueNo()… — đọc dữ liệu từ `app`
js/documents.js            render manh mối dạng "tài liệu" theo detail.type
js/dom.js                  el() / mount() / rich() — helper DOM an toàn (không dùng innerHTML)
js/caseLoader.js           fetch + validateCase() + optionsFor() + loadLibrary() (đọc cases/index.json)
js/storage.js              localStorage key "phaan:v2:<caseId>", tự chuyển dữ liệu từ v1, có fallback bộ nhớ
js/answer.js               partsOf() (danh sách câu kết luận của vụ), chấm điểm (có trừ điểm gợi ý),
                           mã hóa/giải mã lời giải, mâu thuẫn, gợi ý (không đụng DOM)
js/sha256.js               SHA-256 thuần JS (không dùng crypto.subtle — xem bên dưới)
cases/index.json           danh sách vụ án cho kệ hồ sơ ở trang bìa: [{ id, caseNumber, title, difficulty }]
cases/<id>.json            dữ liệu công khai của vụ án + các phần đã mã hóa
authoring/<id>.secret.json đáp án, mâu thuẫn, manh mối bị khóa, gợi ý, lời giải dạng chữ thường — KHÔNG deploy
tools/case-secrets.mjs     validateSecret() + dựng payload, dùng chung cho 2 tool bên dưới
tools/encode-case.mjs      file bí mật → hash/mã hóa vào cases/<id>.json
tools/check-case.mjs       kiểm tra schema, file ảnh, và độ khớp với file bí mật
tools/check-logic.mjs      kiểm chứng mô hình logic (mục "logic" của file bí mật): luật chỉ/bác, 15 tổ hợp, lịch thắng
assets/svg/portraits/      chân dung 200×240 (nạn nhân + nghi phạm); vụ mới để trong thư mục con, vd portraits/case-02/
assets/svg/icons/          icon manh mối 64×64 (nền tròn #26313f) + favicon
assets/svg/scene/          sơ đồ hiện trường (viewBox 800×600)
docs/<id>-solution.md      giải thích chuỗi suy luận để kiểm tra logic — KHÔNG deploy
```

`package.json` chỉ có `"type": "module"` (để Node chạy được `js/*.js` trong tools) và vài script tiện dụng. Không có dependency.

## Kiến trúc

- **Router** (`main.js`):
  - `#/` — bìa hồ sơ
  - `#/case/<tab>` — tab ∈ overview | suspects | clues | scene | board | notes
  - `#/interrogate/<suspectId>` — thẩm vấn, vẽ trong khung màn hồ sơ với tab Nghi phạm được chọn
  - `#/submit` — nộp kết luận
  - `#/result` — kết quả và lời giải

  Đã nộp bài thì `#/submit` tự chuyển sang `#/result`; chưa nộp thì ngược lại.
- **State**: `app = { caseData, progress, unlocked, solution, revealedClues, rank, library }`.
  - `library` = nội dung `cases/index.json`, kèm `status` của từng vụ (đọc từ localStorage lúc khởi động) để hiện trên kệ hồ sơ.
  - Chỉ `main.js` ghi vào `progress`, thông qua `actions`, rồi gọi `saveProgress`.
  - Các module UI nhận `app` + `actions`. Sau khi đổi state, chúng gọi `actions.rerender()` để vẽ lại màn hiện tại mà vẫn giữ vị trí cuộn.
- **Ba nguồn manh mối**:
  - `caseData.clues` — công khai;
  - `app.unlocked.clues` — mở khóa khi thẩm vấn;
  - `app.revealedClues` — các manh mối bị khóa, lộ ra sau khi nộp bài.

  **Luôn dùng `allClues(app)` / `findClue()` trong `selectors.js`**, không đọc thẳng `caseData.clues`. Số MM-xx lấy từ `clue.no`: manh mối công khai được đánh số theo thứ tự trong mảng (`numberBaseClues`), manh mối bị khóa tự khai báo `no`.
- **Modal**: chỉ có một `<dialog>`. `openModal({title, body, foot, onClose})` sẽ thay nội dung nếu modal đang mở. Phần tử có `data-close` đóng modal khi bấm.
- **Import vòng**: `ui.js` ↔ `interrogation.js` ↔ `board.js` import lẫn nhau. ESM chấp nhận điều này vì các hàm chỉ được gọi lúc chạy. Không được dùng giá trị của module kia ở top-level.

### Tiến trình (localStorage, `phaan:v2:<caseId>`)

```jsonc
{
  "started", "lastTab", "viewedClues": [], "viewedHotspots": [], "notes": "", "draft"?: {},
  "interrogation": { "<suspectId>": { "log": [ { "k": "ask", "t": "<topicId>" },
                                               { "k": "present", "t", "c": "<clueId>", "ok": bool, "dup"?: true } ] } },
  "board": { "cards": [{ "id", "kind": "clue|person|note", "ref", "x", "y", "text"? }],
             "links": [{ "id", "from", "to", "label" }], "zoom": number|null },
  "grid": { "columns": [{ "id", "label" }], "cells": { "<suspectId>|<columnId>": "yes|no|maybe" } } | null,  // lưới loại trừ
  "hintsUsed": { "<phần>": 0-3, … },
  "submission": { "<phần>": "<optionId>", …, "submittedAt" } | null,
  "result": { "score", "max", "parts": { "<part>": { "correct", "points", "max", "penalty" } } } | null
}
```

- Thẩm vấn chỉ lưu **nhật ký**. Mọi thứ đã mở khóa (câu hỏi, manh mối, lời khai bổ sung) được tính lại bằng `computeUnlocks()` mỗi lần tải trang, nên nội dung bí mật không nằm dạng chữ trong localStorage. Nhật ký lưu id (topic/clue) chứ không lưu hash, nên chạy lại encode (đổi salt) cũng không làm hỏng tiến trình.
- `grid` là `null` cho tới khi người chơi đụng vào lưới; khi đó `ensureGrid()` (main.js) tạo 3 cột mặc định "Động cơ / Cơ hội / Ngoại phạm". Tối đa 6 cột. Tên cột do người chơi tự đặt — **không** khai báo sẵn trong JSON, để không lộ cấu trúc lời giải.
- Mỗi lượt chơi chỉ được nộp bài **một lần**. "Chơi lại từ đầu" xóa toàn bộ tiến trình.
- Đổi cấu trúc progress thì phải tăng tiền tố key và viết hàm migrate (xem `migrateV1` trong `storage.js`).

### Mã hóa (chống nhìn trộm)

| Thứ gì | Công khai trong JSON | Khóa để giải mã |
|---|---|---|
| Đáp án | `answer[part] = sha256(salt:part:optionId)` | — (chỉ so hash) |
| Lời giải (+ đáp án + manh mối bị khóa) | `solution.payload` | `caseId\|salt`, chỉ giải mã sau khi nộp |
| Mâu thuẫn khi thẩm vấn | `interrogations[s].contradictions[] = {hash, payload}`, `hash = sha256(salt:x:s:topic:clue)` | `caseId\|salt\|x\|s\|topic\|clue`: chỉ có khi trình **đúng** cặp |
| Gợi ý | `hints[part][level]` | `caseId\|salt\|hint\|part\|level`, giải mã khi người chơi mở |

- Mã hóa = XOR với dòng khóa `sha256(seed|i)` rồi base64 (`answer.js`).
- Tự viết SHA-256 vì `crypto.subtle` không có trên http qua IP LAN (không phải secure context), nên test trên điện thoại sẽ hỏng.
- Đây chỉ là **chống nhìn trộm**. Số tổ hợp ít nên người đọc code vẫn brute-force được. Muốn bảo mật thật thì phải xử lý ở server.

### Điểm & gợi ý

- Danh sách phần kết luận lấy từ `partsOf(caseData)`: trường `parts` của vụ, hoặc mặc định `["culprit", "motive", "method"]`. Mọi chỗ (form nộp bài, màn kết quả, gợi ý, chấm điểm, tools) đều đi qua hàm này — **không hardcode tên phần**.
- `scoring` chia điểm cho từng phần. Gợi ý mở lần lượt theo cấp, mỗi cấp trừ `hintCosts[i]` (cộng dồn).
- Điểm trừ **chỉ áp vào phần tương ứng** và không làm điểm phần đó xuống dưới 0. Phần trả lời sai thì bằng 0 sẵn rồi.
- Trình sai bằng chứng khi thẩm vấn **không** bị trừ điểm. Nghi phạm chỉ đáp bằng câu trong `fallback`.

## Chế độ có đồng hồ (`mode: "timed"`, vụ 03)

- Thời gian: `clock.days × clock.slots.length` lượt. Lượt hiện tại = số câu hỏi đã hỏi + 1. Mỗi câu hỏi tốn đúng 1 lượt, kể cả hỏi sai.
- Một câu hỏi = (người, nơi, chủ đề).
  - Người chỉ có mặt ở nơi theo `schedule[người][lượt-1]`.
  - Chủ đề chỉ hiện khi đã có đủ `leads[].requires.clues`.
- `asks[] = { hash, payload }`:
  - hash = sha256(salt:ask:người:nơi:chủ đề);
  - payload mã hóa bằng chính bộ ba đó, chứa `window` (các lượt lấy được), `answer`, `late`/`early` và manh mối đầy đủ.
  - Hỏi đúng bộ ba nhưng ngoài `window` thì nhận câu "đến muộn" / "đến sớm".
- Tiến trình chỉ lưu `progress.timed.log = [{ t, p, l, q }]`. `computeTimed()` giải mã lại và gộp manh mối vào `app.unlocked.clues` (hàm `recompute()` trong main.js).
- Buộc tội: `progress.submission = { h, proof: { [nghi phạm]: [id manh mối…] } }` hoặc `{ giveUp: true }`.
  - Lời giải (giải mã sau khi buộc tội) có `timed = { culprit, keys, proofs, endings }`.
  - `gradeAccusation()` chọn kết cục: `good`, `wrong:<id>`, `missing:<key>`, `unproven` hoặc `timeout`.
- `partsOf()` trả về `[]` cho vụ timed: không có câu hỏi / điểm / gợi ý kiểu cũ.
- File bí mật thêm `logic` (để `check-logic.mjs` kiểm chứng), `asks` và `accusation`.
  - `case-secrets.mjs` đối chiếu: `asks[].window` phải bằng `logic.time.nodes[x].A`, `leads.requires` phải bằng `R(x)`, và người phải có mặt ở nơi đó trong mọi lượt của window.

## Schema `cases/<id>.json`

```jsonc
{
  "id": "case-01", "schemaVersion": 1,
  "caseNumber": "HỒ SƠ SỐ 01", "stamp": "MẬT", "difficulty"?: "Dễ",
  "title", "tagline", "location", "summary", "briefing": ["đoạn…"],
  "victim": { "id", "name", "age", "occupation", "portrait", "facts": ["…"] },
  "suspects": [{ "id", "name", "nickname", "age", "occupation", "relation", "portrait",
                 "details": [{ "label", "value" }], "statement": ["đoạn…"], "alibi": "…" }],
  "categories": [{ "id", "label" }],
  "clues": [{ "id", "title", "category", "icon", "foundAt", "summary",
              "detail": { "type": "…", ... }, "note"?: "ghi chú điều tra viên" }],
  "scene": { "title", "map", "alt", "description",
             "hotspots": [{ "id", "label", "x", "y", "text": ["…"], "clueIds": [] }] },   // x,y theo % ảnh
  "interrogations": {
    "<suspectId>": {
      "intro": ["mô tả khi bắt đầu"],
      "topics": [{ "id", "question", "answer": ["…"],
                   "requires"?: { "topics": ["đã hỏi"], "clues": ["đã xem"] } }],
      "fallback": ["câu đáp khi trình bằng chứng sai"],
      "contradictions": [{ "hash", "payload" }]          // do tool sinh
    }
  },
  "lockedClues": 2,                                       // do tool sinh — chỉ là số lượng
  "hintCosts": [5, 10, 15],                               // bỏ trường này = tắt gợi ý
  "hints": { "<phần>": ["payload×3"], … },               // do tool sinh
  "parts"?: ["mastermind", "target", "motive", "framed", "method"],   // bỏ trống = culprit/motive/method
  "questions": {                                          // mỗi phần trong parts một mục
    "<phần>": { "prompt", "optionsFrom": "suspects" },    // chọn trong danh sách nghi phạm (dùng được cho nhiều phần)
    "<phần>": { "prompt", "options": [{ "id", "label" }] }
  },
  "scoring": { "<phần>": điểm, … },                       // vd case-01: culprit 50 / motive 25 / method 25
  "ranks": [{ "min": 100, "title", "text" }, …],          // min = % điểm tối thiểu
  "answer":   { "algo": "sha256", "salt", "<phần>": "hash", … },          // do tool sinh
  "solution": { "encoding": "xor-b64", "payload" }                          // do tool sinh
}
```

**Lưu ý:** id của topic phải duy nhất trên **toàn vụ án**, kể cả các topic chỉ xuất hiện khi mở khóa.

### Các loại `clue.detail.type`

| type | Trường | Hiển thị |
|---|---|---|
| `text` | `org?`, `heading?`, `meta?[{label,value}]`, `paragraphs[]` (chuỗi hoặc `{list:[…]}`) | biên bản đánh máy |
| `chat` | `owner?`, `contact`, `avatar?`, `messages[]`: `{divider}` · `{from:"me"\|"them", time, text}` · `{status}` | tin nhắn kiểu Zalo; "me" = chủ điện thoại |
| `receipt` | `shop`, `lines?[]`, `title?`, `meta?[]`, `items?[{name,qty,unit,price}]`, `summary?[]`, `total?{label,value}`, `footer?[]` | hóa đơn in nhiệt; số được định dạng `1.953.000đ` |
| `letter` | `date?`, `greeting?`, `body[]`, `closing?`, `signature?`, `variant?: "notebook"` | thư tay / trang sổ (font viết tay) |
| `newspaper` | `paper`, `section?`, `date?`, `headline`, `lead?`, `byline?`, `body[]` | trang báo nhiều cột |
| `notice` | `org[]`, `number?`, `date?`, `title`, `subtitle?`, `body[]`, `signerTitle`, `signer`, `stamp?` | thông báo hành chính có quốc hiệu và con dấu |
| `table` | `heading?`, `meta?`, `columns[]`, `rows[][]`, `footnotes?[]` | bảng nhật ký hệ thống |

- Định dạng chữ an toàn dùng được trong mọi chuỗi: `**đậm**`, `~~gạch bỏ~~`, `_nghiêng_` (xử lý trong `dom.js#rich`). Riêng `receipt.footer` và `lines` là chữ thô.
- Muốn thêm loại tài liệu mới:
  1. viết renderer trong `documents.js` và đăng ký vào `RENDERERS`;
  2. thêm tên loại vào `DOC_TYPES` (caseLoader.js);
  3. viết CSS `.doc--<type>`;
  4. cập nhật bảng trên.

### File bí mật `authoring/<id>.secret.json`

```jsonc
{
  "answers": { "<phần>": "<optionId>", … },              // vd { "culprit": "s-…", "motive": "m-…", "method": "k-…" }
  "contradictions": [{
    "suspect": "s-bao", "topic": "t-bao-night", "clue": "c13",
    "group": "bao-power",                 // nhiều mục cùng group = một mâu thuẫn, trình manh mối nào trong nhóm cũng được
    "response": ["nghi phạm phản ứng…"],
    "unlocks": {
      "topics": [{ "id", "question", "answer": [] }],   // câu hỏi mới (có thể bị phản bác tiếp → chuỗi mâu thuẫn)
      "clues": ["@c16"],                                  // tham chiếu tới lockedClues
      "statement": ["dòng ghi vào mục Lời khai bổ sung"]
    }
  }],
  "lockedClues": [{ /* manh mối đầy đủ như trong "clues" */ "no": 16 }],
  "hints": { "<phần>": ["mơ hồ", "rõ hơn", "gần như chỉ thẳng"], … },
  "solution": {
    "headline", "overview": [], "parts": { "<phần>": "giải thích", … },
    "chain": [{ "title", "text", "clueIds": [], "key"?: true }],
    "redHerrings": [{ "title", "text", "clueIds": [] }],
    "closing"
  }
}
```

## Quy trình thêm hoặc sửa vụ án

1. Sửa `cases/<id>.json` (nội dung công khai, câu hỏi thẩm vấn) và `authoring/<id>.secret.json` (phần bí mật). Vụ mới thì thêm một dòng vào `cases/index.json`.
2. `node tools/encode-case.mjs <id>`: sinh salt mới, rồi hash và mã hóa mọi phần bí mật. Tool tự kiểm tra bằng cách giải mã lại.
3. `node tools/check-case.mjs <id>`: kiểm tra schema, file ảnh (kể cả của manh mối bị khóa), và độ khớp với file bí mật.
4. Viết hoặc cập nhật `docs/<id>-solution.md`.
5. Tool ghi lại JSON bằng `JSON.stringify(…, null, 2)`, nên định dạng file sẽ bị chuẩn hóa.

**Nguyên tắc nội dung:**
- Mọi dữ kiện để giải đều phải có trong game.
- Vụ án phải **giải được mà không cần thẩm vấn hay gợi ý**: thẩm vấn chỉ bổ sung bằng chứng xác nhận.
- Mỗi phương án sai phải bị loại được bằng chứng cứ.
- Có 3–4 manh mối gây nhiễu và 1 manh mối then chốt trông vô hại.
- Câu hỏi thẩm vấn nào nhắc tới manh mối thì nên đặt `requires.clues`, để người chơi không bị lộ thông tin trước khi xem manh mối đó.
- **Vụ rất khó (case-03)** dùng logic phi đơn điệu (luật chỉ khả bác + luật bác chặt). Hung thủ chỉ bị chỉ ra khi có đủ mọi manh mối then chốt, và mọi tổ hợp thiếu đều chỉ nhầm vào người vô tội. Ràng buộc kiểm bằng `tools/check-logic.mjs`; bảng tự kiểm từng tổ hợp ghi ở `docs/<id>-solution.md`.
- **Vụ khó (case-02)** dùng "lưới bộ lọc": hung thủ phải thỏa N điều kiện bắt buộc, mỗi người vô tội vòng trong trượt đúng một điều kiện, nên bỏ qua bất kỳ điều kiện nào cũng còn lại đúng 2 người. Ghi bảng nghi phạm × điều kiện và phần kiểm chứng vào `docs/<id>-solution.md`.
- Bối cảnh case-01 đặt ở năm 2024 để dùng được tên "Quận 7", "TP Thủ Đức" (các đơn vị này đã bị bỏ từ 7/2025).

## Quy ước code

- Không dùng `innerHTML` với dữ liệu vụ án. Luôn dùng `el()` / `rich()` trong `dom.js`. Biến CSS truyền qua `style: {'--x': …}` (`el()` dùng `setProperty`).
- `answer.js`, `sha256.js`, `caseLoader.js#validateCase` không được đụng tới DOM, vì tools chạy bằng Node dùng lại chúng.
- Màu và font lấy từ CSS custom properties ở `:root`; không hardcode màu mới trong JS.
- Vùng bấm tối thiểu 44px trên mobile.
- Breakpoint:
  - 720px: tab xuống đáy (dùng nhãn `short`), modal toàn màn hình, bảng thu nhỏ còn 60%, lưới loại trừ ẩn ảnh và cuộn ngang với cột tên đứng yên;
  - 900px: layout 1 cột.
- Header có `backdrop-filter` trên desktop. Trên mobile phải tắt nó đi, vì nó biến header thành containing block khiến tab bar `position: fixed` không bám được đáy màn hình.
- Bảng suy luận tự vẽ lại phần bảng (`draw()`) khi kéo thả hoặc nối dây, không gọi `rerender` cả trang, để giữ vị trí cuộn của khung bảng.

## Deploy

Chỉ upload: `index.html`, `css/`, `js/`, `cases/`, `assets/`. **Không** upload `authoring/`, `docs/`, `tools/`, `CLAUDE.md`.
