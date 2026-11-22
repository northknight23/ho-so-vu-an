# Case 03 (bản thiết kế) — Mô hình logic "72 giờ"

> ⚠️ **SPOILER.** File ghi lại quá trình thiết kế mô hình logic.
> - **Đã chốt phương án B (mục 5).** Phương án A ở mục 1–4 chỉ còn để tham khảo.
> - Dữ liệu thật của vụ 03 nằm trong mục `logic` của `authoring/case-03.secret.json`.
> - Kiểm chứng: `node tools/check-logic.mjs case-03` (script thoát với mã 1 nếu một tính chất bị vi phạm).
> - Cốt truyện và bảng tự kiểm 15 tổ hợp: [case-03-solution.md](case-03-solution.md).

Bối cảnh mẫu: một nữ tỷ phú rơi khỏi du thuyền trong đêm tiệc trên vịnh Hạ Long. **Sáu** nghi phạm bị tạm giữ 72 giờ:

| Ký hiệu | Nghi phạm | Manh mối minh oan |
|---|---|---|
| A | con trai nạn nhân | k1 |
| B | vị hôn thê của A | k4 |
| C | thư ký | k2 |
| D | bác sĩ riêng | k5 |
| F | em gái nạn nhân (bị gài tội) | k3 |
| E | đối tác — **hung thủ** | không có |

Ký hiệu: ¬ (phủ định), ∧ (và), ∨ (hoặc), ⇒ (kéo theo, "nếu… thì…"), ⇔ (khi và chỉ khi), ⊢ (quy tắc suy luận), ⋂ (giao), \ (hiệu tập).

## 1. Lớp thời gian — lấy được manh mối nào

- Thời gian: T = {1, …, 12}. Mỗi ngày có 4 lượt; ngày của lượt t là d(t) = ⌈t/4⌉.
- Tập lượt khả dụng: **A(x) = { t ∈ W(x) : σ(p(x), t) = ℓ(x) }**, với p(x) là người giữ manh mối, ℓ(x) là nơi, W(x) là thời hạn, σ là lịch có mặt.

**Luật lấy manh mối** (nếu – thì):

  Hₜ₊₁ = Hₜ ∪ {x}  ⇔  t ∈ A(x) ∧ R(x) ⊆ Hₜ ∧ aₜ = (p(x), ℓ(x), x)

| x | A(x) | R(x) | R*(x) (bao đóng bắc cầu) | e – l |
|---|---|---|---|---|
| i1 sổ trực ca | {1..4} | ∅ | ∅ | 1–2 |
| k1 camera cano | {2,3} | {i1} | {i1} | 2–3 |
| k3 túi giặt cabin F | {1..4} | ∅ | ∅ | 1–4 |
| i2 vị trí rơi | {1..5} | ∅ | ∅ | 1–5 |
| k2 điện thoại | {5,6} | {i2} | {i2} | 5–6 |
| k4 bartender | {7,8} | {k1} | {k1, i1} | 7–8 |
| i3 lệnh thu giữ | {9..11} | {k2, k4} | {k2, i2, k4, k1, i1} | 9–11 |
| k5 dữ liệu laptop | {10..12} | {i3} | {i3, k2, i2, k4, k1, i1} | 10–12 |

- **Bắc cầu:** y ≺ x ⇔ y ∈ R(x). Ta có (z ≺ y) ∧ (y ≺ x) ⇒ (z ≺ x), và R*(x) = R(x) ∪ ⋃_{r ∈ R(x)} R*(r).
- **Phủ định lan truyền** (phản đảo): x ∈ H ⇒ R*(x) ⊆ H, suy ra ∃y ∈ R*(x): y ∉ H ⇒ x ∉ H.
  - ¬i1 ⇒ ¬k1 ∧ ¬k4 ∧ ¬i3 ∧ ¬k5
  - ¬k1 ⇒ ¬k4 ∧ ¬i3 ∧ ¬k5
  - ¬k2 ⇒ ¬i3 ∧ ¬k5
  - …
- **Hạn chót:** ∃k ∈ K: k ∉ Hₜ ∧ t > l(k) ⇒ ván đã thua.
- **Kết quả kiểm chứng:** có 216 lịch thắng; m = 8 lượt bắt buộc; độ dư N − m = 4.

## 2. Lớp suy diễn — từ manh mối suy ra ai

### 2.1 Mỗi manh mối là một tập ứng viên

- Biến mệnh đề: H(x) là "x là hung thủ", O(x) là "x có mặt ở boong 3 lúc τ = [23:25, 23:35]".
- Cơ sở tri thức Σ:
  - σ1: ⋁ₓ H(x)
  - σ2: ∀x ≠ y: ¬(H(x) ∧ H(y))
  - σ3: ∀x: H(x) ⇒ O(x)
- Mỗi manh mối then chốt k kéo theo, qua một chuỗi bắc cầu, đúng **một** mệnh đề loại trừ. Áp modus tollens lên σ3: ¬O(x) ∧ (H(x) ⇒ O(x)) ⊢ ¬H(x).
- Viết theo tập hợp: **C(k) = S \ {x_k}**, và ứng viên còn lại sau tập manh mối F là **Cand(F) = ⋂_{k ∈ F} C(k)**.

| k | Chuỗi suy luận (p ⇒ q, q ⇒ r ⊢ p ⇒ r) | Kết luận |
|---|---|---|
| k1 camera cano | A lên cano lúc 23:10 ⇒ rời tàu trước τ (23:10 < 23:25, bắc cầu của <) ⇒ ¬O(A) | ¬H(A) |
| k2 điện thoại | nạn nhân nhắn C 23:26 "xuống phòng họp tầng 1" ∧ thẻ từ C mở phòng họp 23:27 – 23:50 ⇒ ¬O(C) | ¬H(C) |
| k3 túi giặt cabin F | áo F dính máu, **nhưng** túi được thả xuống máng giặt lúc 00:15 từ tầng 3, khi F đang nằm ở phòng y tế có nhân viên trông (00:00 – 02:00) ⇒ người bỏ áo không phải F ⇒ áo bị **gài** ⇒ vật chứng duy nhất chỉ vào F mất giá trị, và F ở phòng y tế suốt τ ⇒ ¬O(F) | ¬H(F) |
| k4 bartender | B ngồi quầy bar tầng 1 từ 23:00 tới 23:50 (gọi đồ lúc 23:22 và 23:31) ⇒ ¬O(B) | ¬H(B) |
| k5 dữ liệu laptop | D khám từ xa, bật camera trong cabin tầng 2 suốt 23:15 – 23:45 ⇒ ¬O(D) | ¬H(D) |

**Đủ 5 manh mối**, áp tam đoạn luận tuyển lên σ1:

  ¬H(A) ∧ ¬H(B) ∧ ¬H(C) ∧ ¬H(D) ∧ ¬H(F) ∧ σ1   ⊢   H(E)

### 2.2 Vì sao bản 5 nghi phạm bị lộ (đã kiểm chứng)

Bản cũ có k3 = V(E), nghĩa là C(k3) = {E}. Khi đó:

  Cand({k3}) = {E}

Một manh mối lấy được ngay ngày 1 đã chỉ thẳng ra hung thủ. Luật "phải đủ 5 mới kết tội" chỉ còn là quy định trên giấy.

**Định lý (chuồng bồ câu).** Gọi manh mối k là **cần thiết** khi |⋂_{i ≠ k} C(i)| ≥ 2. Nếu cả |K| manh mối đều cần thiết, thì:

  **|S| ≥ |K| + 1**

*Chứng minh.*
- Vì k cần thiết, tồn tại x_k ≠ E sao cho x_k ∈ C(i) với mọi i ≠ k, và x_k ∉ C(k). Nói cách khác, x_k bị loại **chỉ bởi** k.
- Nếu x_k = x_j với k ≠ j, thì x_k vừa bị loại chỉ bởi k vừa bị loại chỉ bởi j, mâu thuẫn. Vậy các x_k đôi một khác nhau.
- Suy ra có ít nhất |K| người vô tội, cộng thêm E, nên |S| ≥ |K| + 1. ∎

Script cũng đã duyệt hết **16⁵ = 1.048.576** bộ manh mối trên 5 nghi phạm: **0 bộ** mà cả 5 manh mối đều cần thiết. Với 5 manh mối thì **phải có ít nhất 6 nghi phạm**.

### 2.3 Bản mới thu hẹp đều, không đoán sớm được

Với 6 nghi phạm và C(k) = S \ {x_k}, mỗi manh mối loại **đúng một** người, nên |Cand(F)| = 6 − |F| với **mọi** tập F:

| Số manh mối có | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Ứng viên còn lại | 6 | 5 | 4 | 3 | 2 | 1 |
| Đoán bừa trúng | 1/6 | 1/5 | 1/4 | 1/3 | 1/2 | chắc chắn |

- Không tổ hợp nào thu hẹp nhanh hơn: có k1 và k2 thì vẫn còn 4 người {B, D, F, E}.
- Lấy "hợp" các người đã được minh oan rồi lấy phần bù cũng chỉ ra đúng tập Cand(F), không ra được E sớm hơn.
- k3 giờ trông như bằng chứng buộc tội F, nhưng thực chất là bằng chứng **minh oan** cho F. Nó không còn chỉ vào ai.

### 2.4 Buộc tội phải kèm chứng minh (chặn đoán mò ở lượt cuối)

Ngay cả khi còn 2 ứng viên, người chơi vẫn có 50% đoán trúng. Vì vậy đáp án phải là một cặp **(h, π)**:
- h là người bị buộc tội;
- π : S \ {h} → H gán cho **mỗi** người còn lại một manh mối minh oan họ.

  **Hợp lệ(h, π)   ⇔   ∀y ≠ h:  π(y) ∈ H  ∧  y ∉ C(π(y))**

Script kiểm tra mọi cặp (h, F): chỉ có **(E, K)** chứng minh được. Đoán đúng E nhưng thiếu một manh mối thì vẫn thua.

Trong game, màn kết luận đặt mỗi nghi phạm vô tội vào một ô "Minh oan bởi: [chọn manh mối]". Nút "Buộc tội" chỉ bấm được khi điền đủ 5 ô.

## 3. Định lý tổng hợp

  **Thắng   ⇔   K ⊆ H₁₂  ∧  Hợp_lệ(E, π)   ⇔   người chơi lấy đủ 5 manh mối trong hạn và ghép đúng mỗi manh mối với người nó minh oan**

| Thiếu | Ứng viên còn lại | Bad ending |
|---|---|---|
| k1 | {A, E} | không minh oan được con trai, tòa trả hồ sơ |
| k2 | {C, E} | thư ký bị buộc tội oan |
| k3 | {F, E} | em gái bị kết tội nhờ chiếc áo bị gài |
| k4 | {B, E} | vị hôn thê bị nghi, A rút đơn hợp tác |
| k5 | {D, E} | bác sĩ có ngoại phạm nhưng không chứng minh được, hết 72 giờ phải thả cả hai |

## 4. Ràng buộc khi viết nội dung

1. **Không manh mối nào được chỉ thẳng vào hung thủ:** ∀k: |C(k)| ≥ |S| − 1.
2. **Mỗi người vô tội bị loại bởi đúng một manh mối:** ∀x ≠ E: |{k : x ∉ C(k)}| = 1. Nhờ vậy "thiếu 1 là thua" luôn đúng.
3. **Mồi nhử chỉ sinh động cơ M(x),** và Σ không có luật M(x) ⇒ H(x). Mồi nhử chỉ tốn lượt, không bao giờ thu hẹp được ứng viên.
4. **Manh mối khởi đầu S không được loại ai,** tức C(s) = S với mọi s.
5. Đổi bất kỳ tham số nào thì phải chạy lại `node tools/check-logic.mjs case-03`.

## 5. Phương án B — "tổ hợp chỉ vào ai" (logic phi đơn điệu) — ĐÃ CHỐT

> Bảng dưới đây dùng ký hiệu A–E trừu tượng của bản thiết kế. Bản đã gắn vào cốt truyện (Ly, Châu, Khang, Tuấn, Huy, Hải) có luật bác khác đôi chút cho khớp truyện; xem kết quả bằng `node tools/check-logic.mjs case-03` và bảng tự kiểm ở case-03-solution.md.

Đây là đề xuất của người thiết kế:
- q1 chỉ A;
- q2 chỉ A, B;
- q3 chỉ B;
- q4 chỉ C, D;
- q1 + q2 chỉ A, B, C;
- …
- **chỉ khi có đủ q1 + q2 + q3 + q4 mới chỉ ra E.**

### 5.1 Vì sao phải dùng logic phi đơn điệu

Trong logic thông thường, thêm manh mối chỉ có thể làm **thu hẹp** tập ứng viên Cand(F) = ⋂ C(k). Hung thủ luôn thỏa mọi manh mối thật, nên E ∈ Cand(F) với **mọi** F, và E không thể "ẩn" tới phút cuối.

Muốn E chỉ xuất hiện ở tổ hợp đầy đủ, thì phải có kết luận rút ra từ ít manh mối **bị lật** khi có thêm manh mối:

  ∃F ⊂ F′ : Nghi(F) ⊄ Nghi(F′)

### 5.2 Hai loại luật

| Loại | Dạng | Ý nghĩa |
|---|---|---|
| Luật chỉ ρ (khả bác) | P ⇒ Nghi(x) | nếu có đủ các manh mối P thì **nghi** x (có thể sai) |
| Luật bác δ (chặt) | P ⇒ ¬H(x) | nếu có đủ P thì **chắc chắn** x vô tội |

  **Nghi(F) = { x : ∃ρ bắn cho x  ∧  ¬∃δ bắn cho x }**

Luật chặt thắng luật khả bác. Một luật bắn khi tập tiền đề P ⊆ F.

| Luật chỉ ρ | Luật bác δ |
|---|---|
| {q1} ⇒ Nghi(A) | {q1, q3} ⇒ ¬H(A) |
| {q2} ⇒ Nghi(A), Nghi(B) | {q2, q4} ⇒ ¬H(B) |
| {q3} ⇒ Nghi(B) | {q3, q4} ⇒ ¬H(C) |
| {q4} ⇒ Nghi(C), Nghi(D) | {q1, q4} ⇒ ¬H(D) |
| {q1, q2} ⇒ Nghi(C) | |
| **{q1, q2, q3, q4} ⇒ Nghi(E)** (phá ngoại phạm giả của E) | |

- **Bắc cầu trong luật chỉ:** {q1, q2} ⇒ Nghi(C) là một chuỗi kéo theo qua trung gian.
  - Ví dụ: q1 cho biết "người lên cano lúc 23:10 cầm túi của C", q2 cho biết "túi đó chứa chìa khóa boong 3".
  - Từ đó: C đưa chìa cho người khác ⇒ C là đồng lõa ⇒ Nghi(C).
  - Cả q1 lẫn q2 riêng lẻ đều không chỉ vào C.
- **Phủ định:** mỗi δ là một chứng minh ngoại phạm chặt. Ví dụ {q1, q3} ⇒ ¬O(A) ⇒ ¬H(A), dùng phản đảo của σ3: H(x) ⇒ O(x).
- **Luật của E cần đủ 4 tiền đề:** E có ngoại phạm giả ngay từ hồ sơ ban đầu. Ngoại phạm này chỉ bị phá khi ghép đủ 4 mảnh, kiểu như phép quy đổi múi giờ ở vụ 02 nhưng cần 4 dữ kiện cùng lúc.

### 5.3 Bảng đầy đủ 15 tổ hợp (đã kiểm chứng bằng script)

| F | Nghi(F) | Đã bác |
|---|---|---|
| q1 | {A} | |
| q2 | {A, B} | |
| q3 | {B} | |
| q4 | {C, D} | |
| q1+q2 | {A, B, C} | |
| q1+q3 | {B} | A |
| q2+q3 | {A, B} | |
| q1+q4 | {A, C} | D |
| q2+q4 | {A, C, D} | B |
| q3+q4 | {B, D} | C |
| q1+q2+q3 | {B, C} | A |
| q1+q2+q4 | {A, C} | B, D |
| q1+q3+q4 | {B} | A, C, D |
| q2+q3+q4 | {A, D} | B, C |
| **q1+q2+q3+q4** | **{E}** | A, B, C, D |

Script xác nhận ba tính chất:
- **(i)** Nghi(F) = {E} ⇔ F = Q, và E ∉ Nghi(F) với mọi F ⊊ Q.
- **(ii)** Mọi tổ hợp thiếu đều chỉ vào **ít nhất một người vô tội**. Người chơi luôn có một nghi phạm "trông hợp lý" để buộc tội nhầm.
- **(iii)** Có kết luận bị lật. Ví dụ Nghi(q1) = {A}, nhưng thêm q3 thì A bị bác.

### 5.4 Hai rủi ro đã chặn

1. **Mẹo "người chưa bao giờ bị nghi".**
   - Nếu chỉ có A–E, thì E là người duy nhất không bao giờ xuất hiện ở tổ hợp thiếu, và người chơi sành thể loại sẽ đoán ra.
   - Cách chặn: thêm **G**, một người vô tội có ngoại phạm thật.
   - Khi đó cả E lẫn G đều "sạch" và đều có ngoại phạm, nên tập người chưa từng bị nghi là {E, G}, không chỉ ra riêng E.
2. **Đoán mò ở cuối.** Vẫn giữ luật buộc tội kèm chứng minh (h, π) ở mục 2.4:
   - Mỗi người A–D và G phải được gán đúng luật δ hoặc ngoại phạm minh oan họ.
   - E phải được gán đủ 4 mảnh phá ngoại phạm.

### 5.5 So với phương án A (mục 2)

| | Phương án A — loại trừ | Phương án B — tổ hợp chỉ |
|---|---|---|
| Logic | đơn điệu (giao tập) | phi đơn điệu (luật khả bác + luật chặt) |
| Số manh mối then chốt | 5 | 4 |
| Số nghi phạm | 6 (định lý chuồng bồ câu) | 6 (A–E và G) |
| Người chơi bị dắt mũi? | không: luôn còn 6 − \|F\| ứng viên, không ai bị chỉ nhầm | **có**: mỗi tổ hợp thiếu đều chỉ vào người vô tội |
| E lộ khi nào | chỉ khi đủ 5 | chỉ khi đủ 4 |
| Độ khó viết nội dung | thấp | cao: mỗi tổ hợp phải có lý do trong truyện |
