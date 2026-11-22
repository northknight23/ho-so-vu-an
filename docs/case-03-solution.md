# Case 03 — "72 Giờ": lời giải & kiểm tra logic

> ⚠️ **SPOILER.** Mô hình toán học xem ở [case-03-logic.md](case-03-logic.md), mục 5.
>
> Kiểm chứng:
> ```bash
> node tools/check-logic.mjs case-03
> node tools/encode-case.mjs case-03
> node tools/check-case.mjs case-03
> ```

## 1. Đáp án

- **Hung thủ:** Vương Gia Huy, con trai duy nhất của nạn nhân.
- **Chứng minh có tội:** đủ 4 manh mối then chốt.

| Ký hiệu | MM | Manh mối | Lấy ở đâu | Lượt khả dụng A(x) | Tiên quyết R(x) |
|---|---|---|---|---|---|
| i1 | MM-06 | Sổ trực ca | Thuyền trưởng Hải, buồng lái | 1, 2, 3 | — |
| q1 | MM-07 | Camera đuôi tàu | Kỹ thuật viên Lộc, phòng máy | 2, 3 | i1 |
| q4 | MM-08 | Nhật ký khóa điện tử | Quản lý buồng phòng Mai, quầy lễ tân tàu | 2, 3, 4 (lượt 1 đến sớm) | — |
| i2 | MM-09 | Báo cáo tìm kiếm | Thiếu tá Nam, đồn biên phòng | 1 – 4 | — |
| q2 | MM-10 | Điện thoại nạn nhân | Thợ lặn Sóng, điểm tìm kiếm | 4, 5 | i2 |
| q3 | MM-11 | Lời khai bartender | Bartender Bảo, khách sạn Vịnh Ngọc | 5, 6 | q1 |

Mỗi người vô tội phải được minh oan bằng đúng các tập manh mối sau (chọn thừa không sao, chọn thiếu là hỏng):

| Nghi phạm | Minh oan bằng |
|---|---|
| Ly | q1 + q2 + q3 |
| Châu | q1 + q2 + q3 |
| Tuấn | q1 + q4 |
| Khang | q3 + q4 |
| Hải | c05 (nhật ký vô tuyến) |

**Lớp thời gian:**
- 9 lượt, cần tối thiểu 6 lượt bắt buộc, độ dư 3.
- Chỉ có **5 cách xếp lịch thắng**.
- Ví dụ: lượt 1 i1 → 2 q1 → 3 q4 → 4 i2 → 5 q2 → 6 q3.
- Bỏ lỡ i1 trong 2 lượt đầu ⇒ mất q1 ⇒ mất q3, tức là thua từ ngày 1.

## 2. Chuyện thật

1. **Chiều 20/11:** bà Thục Anh phát hiện Huy giả chữ ký mẹ để cầm cố cổ phần. Phong bì công bố 9:00 sáng 21/11 thực ra **tước quyền thừa kế** của Huy.
2. **16:40:** Huy mượn thẻ phụ #2 (bartender tình cờ thấy). Cũng chiều đó, Huy dặn vị hôn thê Châu: "23:15 quàng khăn đỏ, đội mũ của mẹ đi lên boong 3 để quay clip bất ngờ, rồi vắt khăn lên lan can."
3. **22:30 – 22:33:** BS. Tuấn mang liều thuốc an thần thường lệ. 22:34 ông về phòng y tế.
4. **22:35:** Khang gõ cửa đòi nói chuyện thương vụ, không được mở. Ông ra chân cầu thang đuôi tàu, 23:16 nhắn "K." hẹn bà ở đó; 23:20 xuống quầy bar.
5. **22:38:** Huy mở cửa bằng thẻ #2. **22:41** là lần cuối bà mở máy bằng khuôn mặt.
6. **22:41 – 22:52:** Huy đánh vào gáy mẹ, thả thi thể từ ban công (mạn trái) xuống biển trong mưa và tiếng nhạc.
7. **22:52:** Huy mở máy mẹ bằng mật mã, hẹn giờ 3 tin nhắn: cho Châu lúc 23:05, cho Ly lúc 23:18, cho Tuấn lúc 23:19.
8. **23:10:** Huy lên cano QN-0417 vào bờ.
9. **23:12:** Châu ôm túi quà (khăn và mũ) lên boong. **23:15** cô đóng giả "bà chủ", đi giày thể thao trắng của mình. 23:18 Ly nhận tin và chạy lên boong thì không thấy ai.
10. **23:30:** gió thổi khăn khỏi lan can, thủy thủ thấy vệt đỏ rơi. 23:33 đèn pha bật. Từ đây mọi lời khai đều xoay quanh mốc 23:30, đúng lúc Huy có ngoại phạm hoàn hảo trên bờ.

## 3. Bảng tự kiểm 15 tổ hợp (văn bản không tạo luật ngoài mô hình)

"Nghi" là kết quả của `check-logic.mjs`. Cột cuối giải thích vì sao văn bản manh mối **không** chỉ riêng ra Huy.

| Tổ hợp | Nghi | Vì sao Huy không bị chỉ ra |
|---|---|---|
| q1 | Ly | Camera thấy Huy lên cano **trước** mọi đoạn khác, khớp ngoại phạm |
| q2 | Ly, Châu | Mọi tin là "bà" gửi; mốc 23:15 vẫn đứng |
| q3 | Châu | Bartender kể Huy mượn thẻ #2 để "chào mẹ" — khớp lời khai của Huy |
| q4 | Khang, Tuấn | Thẻ #2 mở cửa 22:38 nhưng không biết của ai |
| q1+q2 | Ly, Châu, Khang | Chưa biết người khăn đỏ là giả |
| q1+q3 | Ly, Châu | Lộ màn đóng giả, Châu thành nghi phạm số 1. Chưa biết giờ chết thật, cũng chưa biết ai vào suite |
| q1+q4 | Ly, Khang | Chưa biết bà chủ luôn đi cao gót, nên đôi giày thể thao không có nghĩa |
| q2+q3 | Ly, Châu | Huy mượn thẻ và tin nhắn hẹn giờ lúc 22:52 — nhưng bà "còn sống" lúc 23:15, mà Wi-Fi tầng 2 phủ cả các cabin 302 – 310 |
| q2+q4 | Ly, Châu, Khang, Tuấn | Không biết thẻ #2 của ai |
| q3+q4 | Châu, Tuấn | Huy vào suite 22:38 — đúng như anh khai; bà "còn sống" lúc 23:15 |
| q1+q2+q3 | Khang | Biết bà chết trong khoảng 22:41 – 22:52, nhưng không có nhật ký thì không biết ai vào suite. Tuấn (khai 22:30), Khang (khai có lên gõ cửa) và Huy (khai "khoảng 10 rưỡi") đều từng ở đó |
| q1+q2+q4 | Ly, Khang | Không có q3 nên chưa chứng minh được đóng giả, và chưa biết chủ thẻ #2 |
| q1+q3+q4 | Ly, Châu | Biết bà chết trước 23:15, nhưng không có giờ chết. Ly (21:02), Tuấn (22:30) và thẻ #2 (22:38) đều từng mở cửa, và đi ra không cần thẻ nên không ai biết ai ở lại cuối |
| q2+q3+q4 | Ly, Châu, Tuấn | Không có q1 nên mốc 23:15 vẫn đứng |
| **q1+q2+q3+q4** | **Huy** | Đóng giả (q1 ∧ q3) ⇒ chết trong 22:41 – 22:52 (q2) ⇒ lượt mở cửa bằng thẻ duy nhất sau 22:33 là thẻ #2 lúc 22:38 (q4) ⇒ thẻ #2 là Huy (q3) |

**Rủi ro chấp nhận:** ở tổ hợp q1+q2+q3, Huy là một trong ba người từng vào suite quanh khung chết thật. Người chơi có thể nghi anh, nhưng chưa thể chứng minh, và còn Tuấn, Khang với lý do tương đương.

## 4. Mồi nhử (mỗi cái tốn 1 lượt, chỉ sinh động cơ)

| Manh mối | Kéo về phía |
|---|---|
| d1 Bản nháp hủy thương vụ | Khang |
| d2 Email cắt thưởng | Ly |
| d3 Đơn thuốc an thần | Tuấn (thực ra chỉ là liều thường) |
| d4 Ảnh tin đồn | Châu |

Câu hỏi "Lúc 23:30 anh/chị ở đâu?" với từng nghi phạm cũng tốn lượt mà không cho manh mối.

## 5. Kết cục

| Khóa | Khi nào |
|---|---|
| `good` | Buộc tội Huy, minh oan đủ cho 5 người, và mọi manh mối dùng đều đã thu được |
| `wrong:<nghi phạm>` | Buộc tội người vô tội (5 kết cục riêng) |
| `missing:q1` … `missing:q4` | Buộc tội Huy nhưng thiếu manh mối then chốt (lấy manh mối thiếu đầu tiên) |
| `unproven` | Buộc tội Huy, có đủ manh mối, nhưng ghép sai chứng minh |
| `timeout` | Bấm "Thả tất cả" |

Đã chơi thử trên trình duyệt: một lịch thắng → `good`; bỏ lỡ camera → chủ đề quầy bar không mở; hết 9 lượt → không hỏi thêm được → `timeout`. Ngoài ra đã thử hàm chấm với 7 trường hợp.

## 6. Sửa vụ án

Mọi tham số thời gian phải khớp ở ba nơi, và `check-case` sẽ báo nếu lệch:
- `logic.time` trong file bí mật (A, R);
- `asks[].window` cùng `leads[].requires`;
- `schedule` trong file công khai.

Đổi luật chỉ / luật bác thì chạy lại `check-logic.mjs` và cập nhật bảng ở mục 3.
