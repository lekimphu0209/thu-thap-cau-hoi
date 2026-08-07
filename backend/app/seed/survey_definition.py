from dataclasses import dataclass, field

OTHER_VALUE = "__other__"
OTHER_SUFFIX = "__other"

CONTROL_RADIO = "radio"
CONTROL_SELECT = "select"
CONTROL_SEARCH_SELECT = "search_select"
CONTROL_CHECKBOX = "checkbox"
CONTROL_SCALE = "scale"
CONTROL_CONSENT = "consent"
CONTROL_SIGNATURE = "signature"

SINGLE_CHOICE_CONTROLS = {CONTROL_RADIO, CONTROL_SELECT, CONTROL_SEARCH_SELECT}


@dataclass(frozen=True)
class Question:
    code: str
    label: str
    control: str
    options: tuple[str, ...] = ()
    required: bool = True
    allow_other: bool = False
    help_text: str | None = None
    scale_labels: tuple[str, ...] = ()


@dataclass(frozen=True)
class ConsentBlock:
    heading: str
    paragraphs: tuple[str, ...]


@dataclass(frozen=True)
class Section:
    code: str
    title: str
    description: str
    questions: tuple[Question, ...]
    consent_blocks: tuple[ConsentBlock, ...] = field(default_factory=tuple)


CONSENT_BLOCKS = (
    ConsentBlock(
        heading="1. Mục đích nghiên cứu",
        paragraphs=(
            "Đây là một nghiên cứu khoa học nhằm xây dựng bộ dữ liệu chuẩn (golden dataset) để đánh giá "
            "chất lượng của một chatbot tư vấn y tế hoạt động theo cơ chế truy xuất tài liệu hướng dẫn "
            "chuyên môn (guideline).",
            "Bộ dữ liệu do các bác sĩ chuyên khoa biên soạn sẽ được dùng làm mốc đối chiếu để đo lường "
            "khách quan mức độ chính xác, độ bám nguồn và mức độ an toàn trong câu trả lời của chatbot.",
        ),
    ),
    ConsentBlock(
        heading="2. Nội dung tham gia",
        paragraphs=(
            "Nếu đồng ý tham gia, bạn sẽ thực hiện hai phần việc: (1) hoàn thành bản khảo sát này về "
            "thông tin nghề nghiệp và mức độ quen thuộc với công nghệ trí tuệ nhân tạo; (2) biên soạn "
            "các câu hỏi lâm sàng kèm câu trả lời chuẩn và nguồn trích dẫn trong chuyên khoa bạn phụ trách.",
            "Bản khảo sát này mất khoảng 5–10 phút. Phần biên soạn dữ liệu được thực hiện theo tiến độ "
            "riêng của bạn và có thể chia thành nhiều lần.",
        ),
    ),
    ConsentBlock(
        heading="3. Lợi ích",
        paragraphs=(
            "Bạn không nhận được lợi ích sức khoẻ trực tiếp từ việc tham gia.",
            "Đóng góp của bạn giúp nâng cao độ an toàn và độ tin cậy của các công cụ hỗ trợ y tế dựa "
            "trên trí tuệ nhân tạo tại Việt Nam, mang lại lợi ích cho cộng đồng chuyên môn và người bệnh.",
        ),
    ),
    ConsentBlock(
        heading="4. Rủi ro và bất tiện",
        paragraphs=(
            "Nghiên cứu này được đánh giá ở mức rủi ro tối thiểu. Bất tiện chính là thời gian bạn dành "
            "để hoàn thành khảo sát và biên soạn dữ liệu.",
            "Nghiên cứu không thu thập thông tin sức khoẻ cá nhân của bạn và không thu thập dữ liệu định "
            "danh của bất kỳ người bệnh nào. Vui lòng không nhập thông tin nhận dạng người bệnh vào hệ thống.",
        ),
    ),
    ConsentBlock(
        heading="5. Bảo mật dữ liệu",
        paragraphs=(
            "Dữ liệu được lưu trữ trên hệ thống nội bộ có kiểm soát truy cập. Chỉ quản trị viên nghiên cứu "
            "được cấp quyền mới xem được thông tin gắn với danh tính của bạn.",
            "Khi công bố kết quả nghiên cứu, dữ liệu sẽ được tổng hợp hoặc ẩn danh; không cá nhân nào được "
            "nêu tên nếu không có sự đồng ý riêng bằng văn bản.",
        ),
    ),
    ConsentBlock(
        heading="6. Tính tự nguyện",
        paragraphs=(
            "Việc tham gia hoàn toàn tự nguyện. Bạn có quyền từ chối tham gia hoặc dừng tham gia ở bất kỳ "
            "thời điểm nào mà không phải nêu lý do.",
            "Việc từ chối hoặc dừng tham gia không gây bất kỳ hậu quả bất lợi nào và không ảnh hưởng đến "
            "công việc, quyền lợi hay các mối quan hệ chuyên môn hiện có của bạn.",
            "Với bản khảo sát này, bạn có thể bỏ qua bất kỳ câu hỏi nào không được đánh dấu bắt buộc.",
        ),
    ),
    ConsentBlock(
        heading="7. Sử dụng dữ liệu trong tương lai",
        paragraphs=(
            "Dữ liệu đã loại bỏ thông tin định danh có thể được sử dụng cho các nghiên cứu tiếp theo về "
            "đánh giá và cải thiện hệ thống hỗ trợ y tế bằng trí tuệ nhân tạo.",
            "Bạn có thể tham gia nghiên cứu mà không đồng ý với nội dung này bằng cách không chọn mục "
            "đồng ý tuỳ chọn ở phần xác nhận bên dưới.",
        ),
    ),
    ConsentBlock(
        heading="8. Liên hệ",
        paragraphs=(
            "Nếu có câu hỏi về nghiên cứu, về quyền của người tham gia, hoặc muốn rút khỏi nghiên cứu, "
            "vui lòng liên hệ nghiên cứu viên chính hoặc quản trị viên đã cấp tài khoản cho bạn theo kênh "
            "liên lạc nội bộ của đơn vị.",
        ),
    ),
)

CONSENT_SECTION = Section(
    code="consent",
    title="Phiếu chấp thuận tham gia nghiên cứu",
    description="Vui lòng đọc kỹ toàn bộ thông tin dưới đây trước khi xác nhận đồng ý tham gia.",
    consent_blocks=CONSENT_BLOCKS,
    questions=(
        Question(
            code="consent_understood",
            label="Tôi đã đọc và hiểu các thông tin về nghiên cứu nêu trên, và đã có cơ hội đặt câu hỏi.",
            control=CONTROL_CONSENT,
        ),
        Question(
            code="consent_voluntary",
            label="Tôi hiểu rằng việc tham gia là tự nguyện và tôi có thể dừng tham gia bất kỳ lúc nào mà không chịu bất lợi nào.",
            control=CONTROL_CONSENT,
        ),
        Question(
            code="consent_data_use",
            label="Tôi đồng ý cho phép sử dụng dữ liệu tôi cung cấp phục vụ nghiên cứu và đánh giá chatbot y tế.",
            control=CONTROL_CONSENT,
        ),
        Question(
            code="consent_future_use",
            label="Tôi đồng ý cho phép sử dụng dữ liệu đã ẩn danh trong các nghiên cứu tiếp theo.",
            control=CONTROL_CONSENT,
            required=False,
            help_text="Mục này là tuỳ chọn. Bạn vẫn có thể tham gia nghiên cứu nếu không chọn.",
        ),
        Question(
            code="consent_signature",
            label="Họ và tên đầy đủ",
            control=CONTROL_SIGNATURE,
            help_text="Nhập họ tên đầy đủ của bạn để xác nhận đồng thuận bằng hình thức điện tử.",
        ),
    ),
)

DEMOGRAPHICS_SECTION = Section(
    code="demographics",
    title="Thông tin nghề nghiệp",
    description="Các thông tin này dùng để phân tầng kết quả nghiên cứu theo nhóm chuyên môn.",
    questions=(
        Question(
            code="age_group",
            label="Nhóm tuổi",
            control=CONTROL_RADIO,
            options=("Dưới 25", "25 – 34", "35 – 44", "45 – 54", "55 – 64", "Từ 65 trở lên", "Không muốn trả lời"),
        ),
        Question(
            code="gender",
            label="Giới tính",
            control=CONTROL_RADIO,
            options=("Nam", "Nữ", "Không muốn trả lời"),
        ),
        Question(
            code="highest_degree",
            label="Trình độ chuyên môn cao nhất",
            control=CONTROL_SELECT,
            options=(
                "Bác sĩ (đa khoa / chuyên ngành)",
                "Bác sĩ nội trú",
                "Bác sĩ chuyên khoa cấp I",
                "Thạc sĩ y học",
                "Bác sĩ chuyên khoa cấp II",
                "Tiến sĩ y học",
            ),
            allow_other=True,
        ),
        Question(
            code="academic_rank",
            label="Học hàm",
            control=CONTROL_RADIO,
            options=("Không có", "Phó giáo sư", "Giáo sư"),
        ),
        Question(
            code="professional_title",
            label="Chức danh nghề nghiệp",
            control=CONTROL_SELECT,
            options=(
                "Bác sĩ (hạng III)",
                "Bác sĩ chính (hạng II)",
                "Bác sĩ cao cấp (hạng I)",
                "Chưa xếp hạng chức danh nghề nghiệp",
            ),
            allow_other=True,
            help_text="Theo hệ thống chức danh nghề nghiệp viên chức y tế do Bộ Y tế quy định.",
        ),
        Question(
            code="management_role",
            label="Chức vụ quản lý hiện tại",
            control=CONTROL_SELECT,
            options=(
                "Không giữ chức vụ quản lý",
                "Phó trưởng khoa / phòng",
                "Trưởng khoa / phòng",
                "Phó giám đốc / Phó viện trưởng",
                "Giám đốc / Viện trưởng",
                "Trưởng bộ môn",
            ),
            allow_other=True,
        ),
        Question(
            code="years_experience",
            label="Số năm kinh nghiệm hành nghề",
            control=CONTROL_RADIO,
            options=("Dưới 5 năm", "5 – 10 năm", "11 – 15 năm", "16 – 20 năm", "Trên 20 năm"),
        ),
        Question(
            code="primary_specialty",
            label="Chuyên khoa chính",
            control=CONTROL_SEARCH_SELECT,
            options=(
                "Tim mạch",
                "Nội tiết - Đái tháo đường",
                "Ung bướu",
                "Hô hấp",
                "Truyền nhiễm",
                "Ký sinh trùng",
                "HIV/AIDS",
                "Da liễu",
                "STDs",
                "Thận học",
                "Thần kinh",
                "Trạm y tế",
                "Huyết học - Truyền máu",
                "Nhi khoa",
                "Sản phụ khoa",
                "Nhiễm khuẩn học - Vi sinh",
                "Phục hồi chức năng",
                "Dược học - Dược lâm sàng",
                "Dinh dưỡng",
                "Tâm thần - Nghiện chất",
                "Y học cổ truyền",
                "Pháp y",
                "Nhãn khoa",
                "Tiết niệu",
                "Gây mê hồi sức",
                "Ngoại khoa - Ghép tạng",
                "Y tế công cộng - Dự phòng",
                "Cấp cứu - Sơ cứu",
            ),
            allow_other=True,
        ),
        Question(
            code="facility_type",
            label="Loại hình cơ sở đang công tác",
            control=CONTROL_SELECT,
            options=(
                "Bệnh viện công lập",
                "Bệnh viện tư nhân",
                "Phòng khám đa khoa / chuyên khoa",
                "Trạm y tế xã, phường",
                "Trường đại học / Viện nghiên cứu",
                "Cơ quan quản lý y tế",
            ),
            allow_other=True,
        ),
        Question(
            code="care_level",
            label="Cấp khám bệnh, chữa bệnh của cơ sở",
            control=CONTROL_RADIO,
            options=(
                "Cấp ban đầu",
                "Cấp cơ bản",
                "Cấp chuyên sâu",
                "Không thuộc cơ sở khám bệnh, chữa bệnh",
            ),
            help_text="Theo phân cấp chuyên môn kỹ thuật của Luật Khám bệnh, chữa bệnh năm 2023.",
        ),
        Question(
            code="region",
            label="Khu vực công tác",
            control=CONTROL_RADIO,
            options=("Miền Bắc", "Miền Trung – Tây Nguyên", "Miền Nam"),
        ),
        Question(
            code="weekly_patient_volume",
            label="Số lượt người bệnh trực tiếp khám mỗi tuần",
            control=CONTROL_SELECT,
            options=(
                "Không trực tiếp khám bệnh",
                "Dưới 20 lượt",
                "20 – 50 lượt",
                "51 – 100 lượt",
                "Trên 100 lượt",
            ),
        ),
        Question(
            code="academic_activities",
            label="Hoạt động đào tạo và nghiên cứu đang tham gia",
            control=CONTROL_CHECKBOX,
            options=(
                "Giảng dạy đại học",
                "Đào tạo sau đại học",
                "Hướng dẫn thực hành lâm sàng",
                "Chủ trì hoặc tham gia đề tài nghiên cứu",
                "Biên soạn hướng dẫn chuyên môn",
                "Không tham gia",
            ),
            required=False,
            allow_other=True,
            help_text="Có thể chọn nhiều mục.",
        ),
    ),
)

AI_SECTION = Section(
    code="ai_familiarity",
    title="Mức độ quen thuộc và sử dụng trí tuệ nhân tạo",
    description="Phần này tìm hiểu trải nghiệm thực tế của bạn với các công cụ trí tuệ nhân tạo trong công việc.",
    questions=(
        Question(
            code="ai_familiarity_level",
            label="Mức độ quen thuộc của bạn với các công cụ trí tuệ nhân tạo trong y tế",
            control=CONTROL_SCALE,
            scale_labels=(
                "Không quen thuộc",
                "Biết sơ qua",
                "Quen thuộc ở mức cơ bản",
                "Khá thành thạo",
                "Rất thành thạo",
            ),
        ),
        Question(
            code="ai_usage_frequency",
            label="Tần suất bạn sử dụng công cụ trí tuệ nhân tạo trong công việc",
            control=CONTROL_RADIO,
            options=(
                "Chưa từng sử dụng",
                "Hiếm khi",
                "Thỉnh thoảng (hàng tháng)",
                "Thường xuyên (hàng tuần)",
                "Hàng ngày",
            ),
        ),
        Question(
            code="ai_tools_used",
            label="Các công cụ trí tuệ nhân tạo bạn đã từng sử dụng",
            control=CONTROL_CHECKBOX,
            options=(
                "Chưa sử dụng công cụ nào",
                "Chatbot đa dụng (ChatGPT, Gemini, Claude, Copilot...)",
                "Công cụ hỗ trợ chẩn đoán hình ảnh",
                "Phần mềm trí tuệ nhân tạo tích hợp trong bệnh án điện tử",
                "Công cụ hỗ trợ tra cứu y văn",
                "Công cụ phiên dịch hoặc ghi chép tự động",
            ),
            allow_other=True,
            help_text="Có thể chọn nhiều mục.",
        ),
        Question(
            code="ai_use_cases",
            label="Bạn đã sử dụng trí tuệ nhân tạo cho công việc nào",
            control=CONTROL_CHECKBOX,
            options=(
                "Chưa sử dụng cho công việc chuyên môn",
                "Tra cứu thông tin y khoa, hướng dẫn chuyên môn",
                "Hỗ trợ định hướng chẩn đoán phân biệt",
                "Tóm tắt hồ sơ bệnh án hoặc y văn",
                "Soạn thảo văn bản hành chính",
                "Giáo dục, tư vấn cho người bệnh",
                "Nghiên cứu khoa học, phân tích số liệu",
                "Giảng dạy, xây dựng tài liệu đào tạo",
            ),
            allow_other=True,
            help_text="Có thể chọn nhiều mục.",
        ),
        Question(
            code="ai_training",
            label="Bạn đã được đào tạo hoặc tham gia nghiên cứu về trí tuệ nhân tạo chưa",
            control=CONTROL_SELECT,
            options=(
                "Chưa từng",
                "Có, tự tìm hiểu",
                "Có, tham dự hội thảo hoặc tập huấn ngắn hạn",
                "Có, hoàn thành khoá đào tạo chính quy",
                "Có, tham gia nghiên cứu về trí tuệ nhân tạo",
            ),
        ),
        Question(
            code="ai_trust_level",
            label="Mức độ tin tưởng của bạn vào câu trả lời chuyên môn do trí tuệ nhân tạo tạo ra",
            control=CONTROL_SCALE,
            scale_labels=(
                "Hoàn toàn không tin tưởng",
                "Ít tin tưởng",
                "Trung lập",
                "Khá tin tưởng",
                "Rất tin tưởng",
            ),
        ),
        Question(
            code="ai_expected_usefulness",
            label="Mức độ hữu ích bạn kỳ vọng ở một chatbot trả lời dựa trên hướng dẫn chuyên môn đã được thẩm định",
            control=CONTROL_SCALE,
            scale_labels=(
                "Hoàn toàn không hữu ích",
                "Ít hữu ích",
                "Trung lập",
                "Khá hữu ích",
                "Rất hữu ích",
            ),
        ),
        Question(
            code="ai_concerns",
            label="Những lo ngại chính của bạn khi ứng dụng trí tuệ nhân tạo trong y tế",
            control=CONTROL_CHECKBOX,
            options=(
                "Không có lo ngại đáng kể",
                "Độ chính xác của thông tin",
                "Thông tin bịa đặt, không có căn cứ",
                "Không rõ nguồn trích dẫn",
                "Trách nhiệm pháp lý khi xảy ra sai sót",
                "Bảo mật dữ liệu người bệnh",
                "Nguy cơ giảm kỹ năng lâm sàng",
                "Thiếu quy định và hướng dẫn sử dụng",
                "Chi phí triển khai",
            ),
            allow_other=True,
            help_text="Có thể chọn nhiều mục.",
        ),
    ),
)

SURVEY_VERSION = "1.0"
SURVEY_SECTIONS: tuple[Section, ...] = (CONSENT_SECTION, DEMOGRAPHICS_SECTION, AI_SECTION)


class Questionnaire:
    def __init__(self, version: str, sections: tuple[Section, ...]) -> None:
        self.version = version
        self.sections = sections
        self._by_code = {
            question.code: question for section in sections for question in section.questions
        }

    @property
    def questions(self) -> list[Question]:
        return list(self._by_code.values())

    def get(self, code: str) -> Question | None:
        return self._by_code.get(code)

    def sanitize(self, answers: dict) -> dict:
        allowed: dict = {}
        for code, question in self._by_code.items():
            if code in answers:
                allowed[code] = answers[code]
            other_key = f"{code}{OTHER_SUFFIX}"
            if question.allow_other and other_key in answers:
                allowed[other_key] = answers[other_key]
        return allowed

    def validate(self, answers: dict) -> dict[str, str]:
        errors: dict[str, str] = {}
        for code, question in self._by_code.items():
            error = self._validate_question(question, answers.get(code), answers)
            if error:
                errors[code] = error
        return errors

    def _validate_question(self, question: Question, value, answers: dict) -> str | None:
        if question.control == CONTROL_CONSENT:
            if question.required and value is not True:
                return "Bạn cần xác nhận mục này để tiếp tục."
            return None

        if question.control == CONTROL_SIGNATURE:
            if not isinstance(value, str) or not value.strip():
                return "Vui lòng nhập họ tên đầy đủ."
            return None

        if question.control == CONTROL_SCALE:
            if value is None or value == "":
                return "Vui lòng chọn một mức." if question.required else None
            if not isinstance(value, int) or not 1 <= value <= len(question.scale_labels):
                return "Giá trị không hợp lệ."
            return None

        if question.control == CONTROL_CHECKBOX:
            if not isinstance(value, list) or not value:
                return "Vui lòng chọn ít nhất một mục." if question.required else None
            return self._validate_choices(question, value, answers)

        if question.control in SINGLE_CHOICE_CONTROLS:
            if not isinstance(value, str) or not value:
                return "Vui lòng chọn một phương án." if question.required else None
            return self._validate_choices(question, [value], answers)

        return None

    def _validate_choices(self, question: Question, values: list, answers: dict) -> str | None:
        allowed = set(question.options)
        for item in values:
            if item == OTHER_VALUE:
                if not question.allow_other:
                    return "Giá trị không hợp lệ."
                other_text = answers.get(f"{question.code}{OTHER_SUFFIX}")
                if not isinstance(other_text, str) or not other_text.strip():
                    return "Vui lòng nhập nội dung cho mục Khác."
            elif item not in allowed:
                return "Giá trị không hợp lệ."
        return None


QUESTIONNAIRE = Questionnaire(SURVEY_VERSION, SURVEY_SECTIONS)
