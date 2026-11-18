# Case 02 — "Két Sắt Không Bị Phá": lời giải & kiểm tra logic

> ⚠️ **SPOILER.** File dành cho người viết/kiểm tra vụ án.

## 1. Đáp án (5 phần, 100 điểm)

| Phần (`parts`) | Câu hỏi | Đáp án | id | Điểm |
|---|---|---|---|---|
| `mastermind` | Ai là "Anh Ba"? | LS Hồ Minh Triết | `s-triet` | 40 |
| `target` | Anh Ba muốn lấy gì trong két? | Di chúc tự viết ngày 12/3/2025 | `x-will` | 10 |
| `motive` | Động cơ? | Che giấu việc cầm cố cổ phần Quỹ Lâm Gia cho công ty của vợ | `m-pledge` | 20 |
| `framed` | Ai bị gài làm vật thế thân? | Lâm Gia Bảo | `s-bao` | 15 |
| `method` | Tắt camera & mở két thế nào? | Lịch "riêng tư" đặt trên iPad phòng khách 13/3 + mã chủ của két | `k-ipad` | 15 |

Năm phần chấm độc lập. Mỗi phần có 3 cấp gợi ý (−5 / −10 / −15, cộng dồn, chỉ trừ vào phần đó).

## 2. Lưới bộ lọc — cốt lõi độ khó

"Anh Ba" bắt buộc phải thỏa cả bốn điều kiện:

| Bộ lọc | Điều kiện | Manh mối cần nối |
|---|---|---|
| **F1** | Tiếp cận được **thẻ mã chủ** của két | MM-03 (két mở bằng MASTER) + MM-19 (thẻ giao cho Dũng tại đại lý, gửi tới văn phòng luật) + MM-20 (sổ lễ tân tầng 6: phong bì nằm 1 tuần trong tủ chung, 6A/6B/6C đều có chìa) + MM-21 (ai ở tầng 6) |
| **F2** | Biết ông Hưng **ở nhà** trước **19:42** ngày 14/3 | MM-13 (tin 19:42) + MM-09 (email 17:50 gửi Triết, Vy, Dũng) + MM-08 (Thảo có mặt; ông Hưng nói dối Phong) + MM-10 (tin của Bảo, Kim) + MM-23 (đơn hoa của Kim) |
| **F3** | **Nghe máy** cuộc gọi Telegram lúc **23:20** | MM-13 (cuộc gọi đã kết nối) + MM-22 (chuyến bay của Vy) + MM-29 khóa (livestream của Bảo) + MM-24/MM-25 (ngoại phạm hội thảo của Triết và giờ giải lao) |
| **F4** | Có mặt ở biệt thự lúc **15:20 ngày 13/3** | MM-04 (lịch #3 tạo từ iPad-PhongKhach, Wi-Fi nội bộ) + MM-05 (sổ cổng) + MM-08 |

### Bảng nghi phạm × bộ lọc

| Nghi phạm | F1 mã chủ | F2 biết ở nhà | F3 nghe máy 23:20 | F4 có mặt 15:20 13/3 | Vòng |
|---|:-:|:-:|:-:|:-:|---|
| **Hồ Minh Triết** | ✓ 6A, giữ thẻ từ 21/6/2023 | ✓ email 17:50 | ✓ giải lao 23:15–23:25 | ✓ 14:30–16:05 | **Hung thủ** |
| Lâm Chấn Phong | ✓ 6B, chìa tủ chung | **✗** bị nói dối "đang ra sân bay" | ✓ ở nhà, không ai xác nhận | ✓ 15:00–15:45 | trong |
| Đoàn Thanh Vy | ✓ 6C, chìa tủ chung | ✓ email 17:50 | **✗** cất cánh 22:41, hạ cánh 23:58, không Wi-Fi | ✓ 14:00–15:30 | trong |
| Phan Văn Dũng | ✓ tự tay mang phong bì (dán lại mép) | ✓ email 17:50 | ✓ ở quê, không ai để ý | **✗** chở bà Kim ra sân bay 14:50–16:40 | trong |
| Nguyễn Thị Thảo | **✗** thẻ chưa từng qua biệt thự | ✓ có mặt, nghe cuộc gọi 18:30 | ✓ ở một mình | ✓ bưng trà ở phòng khách | trong |
| Trịnh Mỹ Kim | ✗ | ✗ tin 21:15 + đơn hoa 21:40 | ✓ | ✗ đã đi sân bay | ngoài |
| Lâm Gia Bảo | ✗ làm ở tầng 8–10, thẻ không mở được tầng 6 (MM-21) | ✗ tin 19:55 "Bố bay an toàn" | ✗ đang hát (MM-29) | ✗ không có trong sổ cổng | ngoài |

### Kiểm chứng (đã chạy bằng script)

| Trường hợp | Còn lại |
|---|---|
| Đủ 4 bộ lọc | **Triết** |
| Bỏ F1 | Triết, **Thảo** |
| Bỏ F2 | Triết, **Phong** |
| Bỏ F3 | Triết, **Vy** |
| Bỏ F4 | Triết, **Dũng** |

Mỗi người vòng trong trượt **đúng một** bộ lọc, nên bỏ sót hay đọc sai bất kỳ bộ lọc nào đều để lại đúng hai nghi phạm, và người chơi phải đoán.

### Bẫy đọc sai của từng bộ lọc

- **F1:** két mở bằng **MASTER**, không phải mã người dùng.
  - Người chơi tưởng két mở bằng mã thường sẽ nghi Kim hoặc Dũng, vì hai người này biết mã cũ.
  - Mã người dùng đã bị đổi ngày 12/3, và không ai được báo mã mới.
- **F2:** cuộc gọi 18:30 giữa Phong và ông Hưng kéo dài 4 phút (MM-10), trông như Phong đã biết anh trai ở nhà.
  - Chỉ lời khai của Thảo (MM-08) mới cho thấy ông Hưng nói dối Phong.
- **F3:** lời khai của Vy ghi "chuyến 21:05, hạ cánh 22:25", tức là chị có vẻ rảnh tay lúc 23:20.
  - Chỉ dữ liệu khai thác chuyến bay (MM-22) mới cho thấy chuyến bị chậm.
- **F3 — ngoại phạm giả của Triết:** báo cáo Zoom ghi ông ở trong phòng họp liên tục từ 22:28 đến 00:07.
  - Chương trình hội thảo ghi **giờ Toronto (EDT, UTC−4)**: giải lao 12:15–12:25 EDT, tức **23:15–23:25** giờ Việt Nam.
  - Nếu cộng nhầm 12 tiếng (theo giờ mùa đông EST), giờ khai mạc 11:30 sẽ thành 23:30, mâu thuẫn với báo cáo Zoom ghi Triết vào phòng lúc 22:28. Phép kiểm tra chéo này giúp người chơi tự phát hiện mình quy đổi sai.
- **F4:** lịch tắt camera được tạo bằng tài khoản `quanly_dung`.
  - Cột "Thiết bị" cho thấy thao tác đến từ iPad-PhongKhach, chỉ dùng được qua Wi-Fi bên trong biệt thự.
  - Chú thích của MM-04 còn ghi rõ hôm đó không có thao tác nào từ điện thoại của Dũng.

## 3. Chuyện thật sự đã xảy ra

| Thời điểm | Sự kiện | Người chơi biết qua |
|---|---|---|
| 15/5/2018 | Di chúc lập Quỹ Lâm Gia: Triết quản lý tới 2030, được làm giao dịch bảo đảm. Hồ sơ kèm bản sao chứng thực CMND của Bảo | MM-17 |
| 14/6/2023 | Dũng nhận thẻ mã chủ tại đại lý, mang lên lễ tân tầng 6. Phong bì nằm trong tủ chung tới 21/6, sau đó Triết ký nhận | MM-19, MM-20 |
| 5/7/2024 | Vợ Triết (Nguyễn Ngọc Hân) lập Công ty Hải Triều | MM-28 (khóa) |
| 22/8/2024 | Triết ký cầm cố 12 triệu cổ phần của quỹ cho khoản vay 180 tỷ của Hải Triều | MM-27 (khóa) |
| 11/3 16:20 | Vy phát hiện cổ phần bị phong tỏa, báo riêng cho ông Hưng | MM-18 |
| 12/3 tối | Ông Hưng tự viết di chúc mới (phong bì "DC 12/3"), đổi mã két lúc 21:10, viết thư cho Bảo | MM-03, MM-16 |
| 13/3 14:00–16:05 | Vy, Triết, Phong lần lượt tới biệt thự. Lúc 14:42 ông Hưng mở két lấy bản lưu di chúc 2018 ra hỏi Triết; Triết thấy phong bì "DC 12/3". Ông Hưng hẹn Triết sáng thứ Hai 17/3 mang sổ sách quỹ tới | MM-03, MM-05, lời khai Triết, Phong, Vy |
| 13/3 15:20 | Triết ngồi chờ ở phòng khách, đặt lịch #3 trên iPad | MM-04, MM-08 |
| 13/3 18:40 – 19:02 | SIM đăng ký bằng bản sao CMND cũ của Bảo; tài khoản Telegram @anhba_dn được lập; Triết mua tài khoản ngân hàng thuê của bà Hoa | MM-15, MM-14 |
| 13/3 20:14 – 21:10 | Anh Ba thuê Tư ("việc gấp: tối mai"), nộp 300 triệu qua máy CDM lúc 20:51, chuyển cho Tư | MM-13, MM-14 |
| 13/3 21:48 | Anh Ba gửi Tư hướng dẫn chi tiết, mô tả phong bì "DC 12/3", "mã két gửi sau" | MM-13 |
| 14/3 08:12 | Anh Ba gửi mã chủ (Triết lấy thẻ từ két văn phòng buổi sáng) | MM-13 |
| 14/3 17:31–17:50 | Chuyến bay bị hủy. Email của trợ lý dời buổi đối chiếu chứng từ lưu ký lên **9h sáng 15/3** | MM-09, MM-10 |
| 14/3 18:30 | Phong gọi; ông Hưng nói dối là đang ra sân bay | MM-08, MM-10 |
| 14/3 19:42 | "Ông ấy KHÔNG đi nữa. Vẫn làm, tối nay." | MM-13 |
| 14/3 22:00 | Mất điện khu vực; camera vẫn ghi nhờ UPS | MM-04, MM-06 |
| 14/3 22:05–22:06 | Ông Hưng gọi Triết không được, nhắn "Mang đủ chứng từ lưu ký" | MM-10 |
| 14/3 22:40 | Lịch #3 bật, camera ngừng ghi | MM-04 |
| 14/3 22:58 | Tư mở két bằng MASTER. Ông Hưng (không uống thuốc ngủ) đi xuống, hai bên giằng co, ông bị giết | MM-02, MM-03, MM-12 |
| 14/3 23:20 | Tư gọi; Triết nghe máy trong giờ giải lao của hội thảo | MM-13, MM-24, MM-25 |
| 15/3 08:40–09:05 | Phong bì được bỏ vào tủ gửi đồ số 47; 8:50 Triết có mặt ở biệt thự "đúng hẹn" | MM-13, lời khai |
| 17/3 | Thư của ông Hưng tới tay Bảo; anh không dám mở, cất tới 10/2026 — vì vậy năm 2025 không ai biết trong két từng có di chúc | MM-16 (ghi chú), MM-07 |
| 18/3 | Tòa Hội An báo hoãn phiên tòa ngày 20/3 cho Triết | MM-26 |
| 20/3 09:02–09:31 | Xe của Triết đỗ ở Hải Đăng Tower; 09:14 nộp 400 triệu tại quầy PGD Lê Duẩn ở tầng trệt | MM-14, MM-30 (khóa) |

## 4. Chuỗi suy luận

1. **Không phải trộm** (MM-12, MM-13, MM-07): kẻ thuê chỉ cần một phong bì; tiền và đồng hồ là tiền công trả cho Tư.
2. Áp lần lượt **bốn bộ lọc** ở mục 2, chỉ còn Triết.
3. **Phá ngoại phạm giả** (MM-24 + MM-25): quy đổi giờ Toronto sang giờ Việt Nam. *(then chốt)*
4. **Vì sao phải là "tối nay"** (MM-09, MM-10, MM-13): chỉ người có hạn chót lúc 9h sáng 15/3 mới cần làm ngay. *(then chốt, tinh tế)*
5. **Động cơ** (MM-16 → MM-17 → MM-18/MM-27 → MM-28): đi từ thư gửi Bảo (quỹ sẽ giải thể), qua di chúc 2018 (Triết quản lý quỹ) và bản xác nhận cầm cố, tới chủ Hải Triều là vợ Triết.
6. **Vật thế thân** (MM-15 + MM-17 + MM-12): SIM đứng tên Bảo, đăng ký bằng bản sao chứng thực lấy từ hồ sơ 2018; Anh Ba còn nói "cậu ấm sẽ bị nghi trước".
7. **Dòng tiền** (MM-14 + MM-26 + MM-30): nộp tiền tại quầy đúng lúc xe Triết đỗ ở tòa nhà đó, vào buổi sáng ông khai đi dự một phiên tòa đã bị hoãn.

**Giải được mà không cần thẩm vấn hay gợi ý:**
- F1, F2, F4 và chuyến bay của Vy chỉ cần manh mối công khai.
- F3 của Bảo cần MM-29 (khóa), nhưng Bảo đã trượt F1 và F2 bằng manh mối công khai.
- Động cơ đọc được từ MM-16, MM-17, MM-18 cùng mục "Gia đình" của Triết. MM-27/MM-28 (khóa) chỉ xác nhận tên công ty và chủ sở hữu.
- **Rủi ro:** chỉ có manh mối công khai thì người chơi vẫn chưa biết bên vay là Hải Triều. Họ suy ra được việc cầm cố ("12 triệu cổ phần bị phong tỏa — cầm cố", người quản lý quỹ là Triết), nhưng chưa thấy mắt xích "công ty của vợ". Phương án `m-pledge` vẫn là lựa chọn duy nhất khớp với dữ kiện công khai.

## 5. Manh mối gây nhiễu

| Manh mối | Kéo về phía | Vì sao sai |
|---|---|---|
| MM-06 thông báo cúp điện | phương án `k-power`; gợi lại cách giải vụ 01 | UPS vẫn ghi; camera tắt lúc 22:40 theo lịch, không phải lúc 22:00 |
| MM-07 tài sản bị mất | phương án `x-cash`, `m-money` | Telegram nói rõ tiền và đồng hồ là tiền công cho Tư |
| MM-15 SIM đứng tên Bảo | Bảo | Bảo trượt F1, F2, F3. Đây là bằng chứng gài tội |
| MM-04 tài khoản quanly_dung | Dũng (cả câu hỏi `framed`) | Thao tác từ iPad, lúc Dũng đang ở sân bay |
| MM-10 cuộc gọi 18:30 | Phong | Bị nói dối (MM-08) |
| Lời khai "chuyến 21:05" của Vy | Vy | MM-22 |
| MM-23 khách nam ở cùng Kim | Kim (ngoại tình) | Chuyện riêng; đơn hoa chứng minh Kim tin ông Hưng đã bay |
| Thảo nghỉ việc, chuyển 120 triệu | Thảo | Không có đường tới thẻ mã chủ |

## 6. Kiểm tra tính công bằng

- Giờ Toronto: chương trình ghi rõ "EDT, UTC−4" và "từ 9/3/2025 chuyển giờ mùa hè", nên người chơi không cần kiến thức ngoài.
- Thẻ mã chủ không thể đã nằm ở biệt thự: MM-19 ghi "bàn giao tại đại lý ngày 14/06/2023", và MM-20 ghi Dũng giao ở tầng 6 cùng ngày. Thảo không có cơ hội tiếp cận.
- Phong không thể biết ông Hưng ở nhà qua người khác: email chỉ gửi ba người (MM-09); Kim và Bảo cũng không biết. Không có manh mối nào cho thấy Phong liên lạc với Triết, Vy hay Dũng chiều tối 14/3.
- Vy không thể nghe máy trên máy bay: MM-22 ghi rõ không có Wi-Fi hay điện thoại trên không.
- Dũng không thể đặt lịch từ xa: MM-04 ghi thao tác từ iPad-PhongKhach chỉ làm được qua Wi-Fi nội bộ, và không có thao tác nào từ điện thoại của Dũng.
- Mã MASTER cố định, không đổi được (MM-03, MM-19). Vì vậy việc đổi mã ngày 12/3 không ngăn được Anh Ba.

## 7. Thẩm vấn (20 mâu thuẫn, 4 manh mối khóa)

| Nghi phạm | Câu trả lời bị phản bác | Trình | Mở khóa |
|---|---|---|---|
| Triết | Đêm 14/3 (hội thảo) | MM-25 | câu hỏi "Trong 10 phút giải lao…" |
| Triết | Giải lao | MM-13 | lời khai bổ sung |
| Triết | Buổi làm việc 15/3 | MM-09 hoặc MM-10 | lời khai bổ sung |
| Triết | Quỹ "nguyên vẹn" | MM-18 hoặc MM-27 | câu hỏi "Khoản vay của ai?" |
| Triết | Hải Triều là "khách hàng" | MM-28 | lời khai: vợ là chủ |
| Triết | Sáng 20/3 dự tòa ở Hội An (cần đã xem MM-14) | MM-26 | **MM-30** |
| Triết | Phong bì niêm phong | MM-20 | lời khai (đổ cho Dũng) |
| Phong | Cuộc gọi 18:30 | MM-09 hoặc MM-08 | lời khai: không biết anh ở nhà |
| Vy | Quỹ không có vấn đề | MM-18 | **MM-27** + câu hỏi mới |
| Vy | Lần cuối gặp là 10/3 | MM-05 | **MM-28** |
| Vy | Chuyến 21:05 | MM-22 | lời khai sửa giờ bay |
| Dũng | Thẻ mã chủ (cần đã xem MM-19) | MM-20 | lời khai: tự dán lại mép |
| Dũng | Tài khoản camera | MM-04 | lời khai: lúc đó đang ở sân bay |
| Kim | Ở khách sạn một mình | MM-23 | lời khai: có người đi cùng; đơn hoa |
| Bảo | SIM đứng tên anh, "tôi không đăng ký" (cần đã xem MM-15) | MM-13 (tài khoản Anh Ba nghe máy lúc 23:20) | **MM-29** |
| Bảo | Cãi bố về di chúc | MM-16 | lời khai: chỉ biết nội dung thư sau đám tang |
| Thảo | Phòng khách 13/3, "không ai đụng iPad" | MM-04 | lời khai: có người ngồi sát kệ lúc 15:20; chính chị cũng có mặt |

Nguyên tắc: mỗi mâu thuẫn phải là **manh mối bác bỏ trực tiếp điều nghi phạm vừa nói**. Không dùng kiểu "trình một giấy tờ bất kỳ rồi nghi phạm tự khai thêm".

## 8. Những điểm có thể bị bắt bẻ

- *"Triết có thể dùng điện thoại khác để nghe Telegram trong lúc vẫn ngồi Zoom."* Đúng. Bộ lọc F3 chỉ hỏi ai **có thể** nghe máy, nên ngoại phạm của Triết không loại được ông. Nó chỉ trông như loại được.
- *"Phong có thể đoán anh trai nói dối."* Tin nhắn 19:42 khẳng định chắc chắn "KHÔNG đi nữa", đó là thông tin chứ không phải phỏng đoán. Phong không có nguồn nào để biết.
- *"Vy biết hết mọi chuyện, sao không phải Vy?"* Vy là người phát hiện và báo cho ông Hưng. Bà không có lợi gì khi di chúc 2018 còn hiệu lực, và đang ở trên máy bay lúc 23:20.
- *"Ai biết thói quen uống thuốc ngủ?"* Ai thân với ông Hưng cũng biết (lời Thảo). Đây không phải bộ lọc.
- *"Ai biết phong bì ghi 'DC 12/3'?"* Người có mặt trong phòng làm việc lúc két mở 14:42 ngày 13/3. Ghép lời khai của Phong ("anh ấy đang tiếp luật sư Triết") với lời Triết ("anh Hưng mở két lấy bản lưu di chúc 2018") thì đó là Triết. Đây là chứng cứ **xác nhận thêm**, không phải bộ lọc bắt buộc.
- *"Sao năm 2025 không ai nhắc tới bản di chúc mất tích?"* Chỉ ông Hưng, Triết (và có thể Vy) biết nó tồn tại. Bảo nhận thư ngày 17/3 nhưng không dám mở tới 10/2026; bảng kê bảo hiểm (MM-07) ghi rõ gia đình không biết trong két có giấy tờ gì.
- *"Sao chuẩn bị gấp vậy — chỉ trong một tối?"* Phong bì chỉ xuất hiện từ đêm 12/3, Triết thấy nó chiều 13/3, và ông Hưng bay tối 14/3. Mọi thứ (SIM 18:40, Telegram 19:02, tài khoản thuê, lời mời Tư 20:14) dồn vào tối 13/3 chính là dấu vết: kẻ chủ mưu biết về phong bì từ chiều hôm đó.
- *"Anh Ba có thể là hai người (một người nhắn, một người nghe máy)?"* Tư mô tả một giọng duy nhất, cùng lối nói giấy tờ trong tin nhắn và cuộc gọi. Lời giải coi Anh Ba là một người.
- *"Khoản vay của Hải Triều đã quá hạn chưa?"* Đáo hạn 22/8/2027, nên lúc thẩm vấn (10/2026) Triết vẫn có thể nói "sẽ tất toán đúng hạn".

## 9. Gợi ý 3 cấp

Gợi ý nằm trong `authoring/case-02.secret.json`, mục `hints`.
- Gợi ý cấp 2 của câu `mastermind` nói thẳng bốn bộ lọc.
- Gợi ý cấp 3 nói thẳng phép quy đổi múi giờ.

## 10. Sửa vụ án

```bash
node tools/encode-case.mjs case-02
node tools/check-case.mjs case-02
```

Đổi bất kỳ dữ kiện nào trong bảng ở mục 2 thì phải chạy lại phần kiểm chứng "bỏ một bộ lọc" và cập nhật bảng.
