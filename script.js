/**
 * 모달 애니메이션 시스템 초기화
 * 
 * [언제] DOM이 완전히 로드된 후 즉시 실행
 * [왜] HTML 요소들이 모두 준비된 상태에서 안전하게 JavaScript로 조작하기 위함
 * [어떻게] DOMContentLoaded 이벤트를 통해 DOM 트리 구성 완료를 감지하고 초기화 시작
 * [무엇을] 다양한 타입의 모달(팝업) 창을 부드러운 애니메이션과 함께 표시하는 시스템
 * [누가] 웹페이지 방문자가 버튼을 클릭하여 모달을 열고 닫을 수 있음
 * [어디서] 현재 웹페이지 전체에서 모달이 오버레이 형태로 표시됨
 */
document.addEventListener('DOMContentLoaded', () => {
    /*
     * =================================================================
     * 변수 및 설정
     * =================================================================
     */

    /**
     * 메인 DOM 요소 참조 저장
     * 
     * [무엇을] 페이지의 핵심 DOM 요소들을 변수에 저장
     * [왜] 반복적인 DOM 쿼리를 피하고 성능을 최적화하기 위함
     * [어떻게] getElementById와 querySelector를 사용하여 요소를 찾고 참조를 유지
     */
    const mainContent = document.getElementById('main-content');
    const modalWrapper = document.getElementById('modal-wrapper');
    const modalTemplate = document.getElementById('modal-template');
    const triggerButtons = document.querySelectorAll('.modal-trigger');

    /**
     * 리사이즈 이벤트 디바운스 타이머
     * 
     * [무엇을] 윈도우 리사이즈 이벤트의 과도한 발생을 제어하는 타이머 변수
     * [왜] 리사이즈 중 수십~수백 번 발생하는 이벤트를 최적화하여 성능 저하 방지
     * [어떻게] setTimeout을 활용한 디바운싱으로 마지막 이벤트만 처리
     * [언제] 사용자가 브라우저 창 크기를 조정할 때 활용
     */
    let resizeDebounceTimer;

    /**
     * 모달 타입별 스타일 설정 객체
     * 
     * [무엇을] 7가지 모달 타입(모바일 3종, PC 4종)의 레이아웃과 스타일 정의
     * [왜] 디바이스와 콘텐츠 양에 따라 최적화된 모달 표시를 위함
     * [어떻게] Tailwind CSS 클래스를 조합하여 반응형 레이아웃 구성
     * [누가] 개발자가 정의하고, 시스템이 자동으로 적용
     * [어디서] 모달 컨테이너와 모달 본체에 각각 적용
     * [언제] 모달이 생성되거나 타입이 변경될 때 사용
     */
    const modalConfigs = {
        'mo-small-center': { container: 'items-center justify-center px-4 py-12', content: 'rounded-2xl w-full max-w-md max-h-full' },
        'mo-small-bottom': { container: 'items-end justify-center pt-12', content: 'w-full rounded-t-2xl max-h-full' },
        'mo-medium-bottom': { container: 'items-end justify-center pt-12', content: 'w-full rounded-t-2xl max-h-full' },
        'mo-large-full': { container: 'items-center justify-center p-0', content: 'w-full h-full rounded-none m-0' },
        'pc-small-center': { container: 'items-center justify-center p-16', content: 'rounded-2xl w-full max-w-lg max-h-full' },
        'pc-medium-center': { container: 'items-center justify-center p-16', content: 'rounded-2xl w-full max-w-xl max-h-full' },
        'pc-large-center': { container: 'items-center justify-center p-16', content: 'rounded-2xl w-full max-w-2xl max-h-full' },
    };

    /**
     * 오버레이 페이드아웃 딜레이 설정
     * 
     * [무엇을] 모달 크기별 배경 오버레이의 사라지는 타이밍 지연 시간
     * [왜] 콘텐츠와 배경이 자연스럽게 순차적으로 사라지는 효과를 위함
     * [어떻게] 작은 모달은 빠르게(50ms), 큰 모달은 느리게(300ms) 배경이 사라짐
     * [언제] 모달을 닫을 때 CSS 애니메이션에 동적으로 적용
     * [어디서] 오버레이 요소의 애니메이션 지연 시간으로 사용
     */
    const OVERLAY_DELAYS = {
        'small': '50ms',
        'medium': '150ms',
        'large': '300ms'
    };

    /**
     * 모바일 전용 모달 타입 목록
     * 
     * [무엇을] 모바일 환경에서만 사용되는 3가지 모달 타입의 식별자
     * [왜] 모바일에서는 화면이 작아 콘텐츠 오버플로우 시 특별한 처리가 필요
     * [어떻게] 이 배열로 모바일 타입을 구분하여 동적 레이아웃 조정 적용
     * [언제] 모달 타입 확인이나 모바일 전용 기능 적용 시 참조
     * [누가] checkAndAdjustModalType 함수가 주로 사용
     */
    const MOBILE_TYPES = ['mo-small-center', 'mo-small-bottom', 'mo-medium-bottom'];

    /**
     * Lorem Ipsum 더미 텍스트 콘텐츠
     * 
     * [무엇을] 모달 내부에 표시할 기본 샘플 텍스트 1개
     * [왜] 모달 크기별로 다른 양의 콘텐츠를 표시하여 실제 사용 환경 시뮬레이션
     * [어떻게] small(1개), medium(2개), large(10개)로 동일한 텍스트를 반복
     * [언제] 모달 DOM이 생성될 때 getParagraphCount 함수와 함께 사용
     * [어디서] 각 모달의 .lorem-ipsum-content 영역에 삽입
     */
    const baseLoremText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue.';

    /**
     * 모달 타입별 문단 개수 결정 함수
     * 
     * [무엇을] 모달 타입 문자열에서 크기를 추출하여 표시할 문단 수를 반환
     * [왜] 모달 크기에 비례하는 적절한 양의 콘텐츠를 표시하기 위함
     * [어떻게] 타입명에 포함된 'small', 'medium', 'large' 키워드를 찾아 매핑
     * [언제] 모달 DOM 생성 시 Lorem Ipsum 콘텐츠 양을 결정할 때
     * [누가] Object.keys().forEach() 내부에서 호출
     * [어디서] 반환값은 Array.fill()의 반복 횟수로 사용됨
     */
    const getParagraphCount = (type) => {
        const sizeMap = { 'small': 1, 'medium': 2, 'large': 10 };
        const size = Object.keys(sizeMap).find(s => type.includes(s)) || 'small';
        return sizeMap[size];
    };

    /*
     * =================================================================
     * DOM 초기화
     * =================================================================
     */
    /**
     * 모달 DOM 요소 사전 생성 및 초기화
     * 
     * [무엇을] 7가지 모달 타입의 DOM 구조를 미리 생성하여 메모리에 보관
     * [왜] 런타임 DOM 생성 비용을 제거하고 즉각적인 모달 표시를 위함
     * [어떻게] modalConfigs의 각 타입을 순회하며 템플릿 복제 및 커스터마이징
     * [언제] 페이지 로드 시 단 한 번만 실행되어 모든 모달을 준비
     * [누가] 시스템이 자동으로 생성하고, 사용자는 버튼 클릭으로 활성화
     * [어디서] #modal-wrapper 요소 내부에 hidden 상태로 추가됨
     */
    Object.keys(modalConfigs).forEach(type => {
        const config = modalConfigs[type];

        // 모달 컨테이너 생성
        const container = document.createElement('div');
        container.id = `modal-container-${type}`;
        container.dataset.originalType = type;
        container.dataset.layoutType = type; // 초기 레이아웃 타입 설정
        container.className = `modal-container fixed inset-0 z-50 flex hidden ${config.container}`;

        // 오버레이(배경) 생성
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay absolute inset-0';

        // 템플릿에서 모달 본체 복제
        const bodyClone = modalTemplate.content.cloneNode(true);
        const body = bodyClone.querySelector('.modal-body');
        body.className += ` ${config.content}`;
        body.querySelector('.modal-title').textContent = `모달 유형: ${type}`;

        // Lorem Ipsum 콘텐츠 동적 생성
        const loremContent = body.querySelector('.lorem-ipsum-content');
        loremContent.classList.remove('hidden');

        // 기본 텍스트를 필요한 횟수만큼 반복하여 문단 생성
        const paragraphCount = getParagraphCount(type);
        loremContent.innerHTML = Array(paragraphCount)
            .fill(baseLoremText)
            .map(text => `<p class="lorem-paragraph">${text}</p>`)
            .join('');

        // 푸터 둥근 모서리 설정 (center 타입만 적용)
        const footer = body.querySelector('.modal-footer');
        if (type.includes('center')) {
            footer.classList.add('rounded-b-2xl');
        }

        // DOM에 추가
        container.appendChild(overlay);
        container.appendChild(body);
        modalWrapper.appendChild(container);
    });

    /*
     * =================================================================
     * 유틸리티 함수
     * =================================================================
     */
    /**
     * CSS 애니메이션 지속시간 파싱 함수
     * 
     * [무엇을] CSS animation 속성 문자열에서 총 실행 시간을 밀리초로 계산
     * [왜] 애니메이션 완료 시점을 정확히 알아 모달을 적절히 숨기기 위함
     * [어떻게] 정규식으로 시간 값들을 추출하고 duration + delay를 합산
     * [언제] 모달 닫기 애니메이션 시작 후 타이머 설정 시 호출
     * [누가] closeModal 함수가 계산된 시간으로 setTimeout 설정
     * [어디서] getComputedStyle로 얻은 animation 속성값을 파싱
     * 
     * @param {string} animationStr - CSS animation 속성값
     * @returns {number} 밀리초 단위의 총 지속시간
     */
    const parseDuration = (animationStr) => {
        if (!animationStr || animationStr === 'none') return 0;

        // 정규식을 사용하여 모든 시간 값 추출
        const timeValues = animationStr.match(/\d+(\.\d+)?(ms|s)/g) || [];

        if (timeValues.length === 0) return 0;

        // 시간 값을 밀리초로 변환
        const timesInMs = timeValues.map(time => {
            const value = parseFloat(time);
            return time.endsWith('s') && !time.endsWith('ms') ? value * 1000 : value;
        });

        // duration + delay (첫 두 시간 값의 합)
        return timesInMs.slice(0, 2).reduce((sum, time) => sum + time, 0);
    };

    /*
     * =================================================================
     * 유틸리티 함수 
     * =================================================================
     */

    /**
     * 모달 애니메이션 클래스 초기화 함수
     * 
     * [무엇을] 오버레이와 콘텐츠 요소에서 모든 애니메이션 관련 클래스를 제거
     * [왜] 이전 애니메이션 상태가 새 애니메이션과 충돌하는 것을 방지
     * [어떻게] classList.remove로 특정 클래스들을 제거, filter로 동적 클래스 탐색
     * [언제] 모달을 열거나 닫기 직전에 깨끗한 상태를 만들 때
     * [누가] openModal과 closeModal 함수가 애니메이션 시작 전에 호출
     * [어디서] 모달 오버레이와 모달 본체 요소에 직접 적용
     * 
     * @param {HTMLElement} overlay - 오버레이 요소
     * @param {HTMLElement} content - 콘텐츠 요소
     */
    const resetAnimationClasses = (overlay, content) => {
        overlay.classList.remove('modal-overlay-open', 'modal-overlay-close', 'modal-overlay-close-dynamic', 'animated');
        content.classList.remove(...Array.from(content.classList).filter(c => c.includes('-open') || c.includes('-close')), 'animated');
    };

    /**
     * 모달 타입명에서 크기 키워드 추출 함수
     * 
     * [무엇을] 'mo-small-center' 같은 타입명에서 'small' 크기 키워드를 추출
     * [왜] 크기별로 다른 애니메이션 딜레이나 스타일을 적용하기 위함
     * [어떻게] includes() 메서드로 문자열에 크기 키워드가 포함되었는지 확인
     * [언제] 오버레이 딜레이 계산 시 OVERLAY_DELAYS 객체의 키로 사용
     * [누가] closeModal 함수가 오버레이 애니메이션 딜레이 설정 시 호출
     * [어디서] 모달 타입 문자열을 분석하여 크기 정보만 반환
     * 
     * @param {string} modalType - 모달 타입
     * @returns {string} 크기 (small, medium, large)
     */
    const getModalSize = (modalType) => {
        if (modalType.includes('small')) return 'small';
        if (modalType.includes('medium')) return 'medium';
        if (modalType.includes('large')) return 'large';
        return 'small';
    };

    /*
     * =================================================================
     * 모달 관리 함수
     * =================================================================
     */

    /**
     * 레이아웃만 변경하는 함수 (애니메이션 클래스는 유지)
     * @param {HTMLElement} modalContainer - 모달 컨테이너 요소
     * @param {string} layoutType - 적용할 레이아웃 타입
     */
    const applyLayoutOnly = (modalContainer, layoutType) => {
        const newConfig = modalConfigs[layoutType];
        const modalBody = modalContainer.querySelector('.modal-body');
        const modalFooter = modalContainer.querySelector('.modal-footer');

        // 컨테이너 레이아웃 변경
        const wasHidden = modalContainer.classList.contains('hidden');
        modalContainer.className = `modal-container fixed inset-0 z-50 flex ${newConfig.container}`;
        if (wasHidden) {
            modalContainer.classList.add('hidden');
        }

        // 모달 바디 레이아웃 변경
        modalBody.className = `modal-body bg-white shadow-2xl z-10 flex flex-col ${newConfig.content}`;

        // 푸터 둥근 모서리 설정
        modalFooter.classList.remove('rounded-b-2xl');
        if (layoutType.includes('center')) {
            modalFooter.classList.add('rounded-b-2xl');
        }
    };

    /**
     * 모바일 모달의 콘텐츠 오버플로우 체크 및 레이아웃 조정
     * @param {HTMLElement} modalContainer - 모달 컨테이너 요소
     */
    const checkAndAdjustModalType = (modalContainer) => {
        const originalType = modalContainer.dataset.originalType;

        // 모바일 타입이 아니면 처리하지 않음
        if (!MOBILE_TYPES.includes(originalType)) return;

        // 모달 내부 요소들의 높이 계산
        const modalHeader = modalContainer.querySelector('.modal-header');
        const mainContentElement = modalContainer.querySelector('.modal-main-content');
        const modalFooter = modalContainer.querySelector('.modal-footer');

        const totalContentHeight = modalHeader.offsetHeight + mainContentElement.scrollHeight + modalFooter.offsetHeight;
        const availableHeight = modalContainer.clientHeight;

        const isContentOverflowing = totalContentHeight > availableHeight;

        if (isContentOverflowing) {
            // 콘텐츠가 넘치면 풀사이즈로 변경 (애니메이션은 원래 타입 유지)
            modalContainer.dataset.layoutType = 'mo-large-full';
            applyLayoutOnly(modalContainer, 'mo-large-full');
        } else {
            // 콘텐츠가 충분하면 원래 레이아웃으로 복원
            if (modalContainer.dataset.layoutType === 'mo-large-full') {
                modalContainer.dataset.layoutType = originalType;
                applyLayoutOnly(modalContainer, originalType);
            }
        }
    };

    /**
     * 모달 열기
     * @param {string} requestedType - 열려는 모달의 타입
     */
    const openModal = (requestedType) => {
        const modalContainer = document.getElementById(`modal-container-${requestedType}`);
        if (!modalContainer) return;

        // body 스크롤 방지
        document.body.classList.add('overflow-hidden');

        // 현재 타입 설정
        modalContainer.dataset.currentType = requestedType;

        const modalOverlay = modalContainer.querySelector('.modal-overlay');
        const modalContent = modalContainer.querySelector('.modal-body');

        // 이전 애니메이션 클래스 제거
        resetAnimationClasses(modalOverlay, modalContent);

        // 이전 CSS 변수 정리
        modalOverlay.style.removeProperty('--overlay-delay');

        // 모달 표시
        modalContainer.classList.remove('hidden');

        // 다음 프레임에서 애니메이션 시작
        requestAnimationFrame(() => {
            // 콘텐츠 오버플로우 체크
            checkAndAdjustModalType(modalContainer);

            // 패럴렉스 효과는 원래 타입이 mo-large-full일 때만 적용
            const originalType = modalContainer.dataset.originalType;
            if (originalType === 'mo-large-full') {
                mainContent.classList.add('parallax-effect');
            }

            // 열기 애니메이션 적용
            modalOverlay.classList.add('animated', 'modal-overlay-open');
            modalContent.classList.add('animated', `modal-${modalContainer.dataset.currentType}-open`);
        });
    };

    /**
     * 모달 닫기
     * @param {HTMLElement} modalContainer - 닫을 모달 컨테이너 요소
     */
    const closeModal = (modalContainer) => {
        if (!modalContainer) return;

        // 패럴렉스 효과 제거
        if (modalContainer.dataset.originalType === 'mo-large-full') {
            mainContent.classList.remove('parallax-effect');
        }

        const type = modalContainer.dataset.currentType;
        const modalOverlay = modalContainer.querySelector('.modal-overlay');
        const modalContent = modalContainer.querySelector('.modal-body');

        // 이전 애니메이션 클래스 제거
        resetAnimationClasses(modalOverlay, modalContent);

        // 모달 타입에 따라 오버레이 딜레이 설정
        const overlayDelay = OVERLAY_DELAYS[getModalSize(type)] || '0ms';

        // 다음 프레임에서 닫기 애니메이션 시작
        requestAnimationFrame(() => {
            // CSS 변수로 오버레이 딜레이 설정
            modalOverlay.style.setProperty('--overlay-delay', overlayDelay);

            // 닫기 애니메이션 적용
            modalOverlay.classList.add('animated', 'modal-overlay-close-dynamic');
            modalContent.classList.add('animated', `modal-${type}-close`);

            // 애니메이션 지속시간 계산
            const contentComputedStyle = window.getComputedStyle(modalContent);
            const overlayComputedStyle = window.getComputedStyle(modalOverlay);

            const contentDuration = parseDuration(contentComputedStyle.animation);
            const overlayDuration = parseDuration(overlayComputedStyle.animation);

            const timeoutDuration = Math.max(contentDuration, overlayDuration);

            // 애니메이션 종료 후 모달 숨기기
            setTimeout(() => {
                modalContainer.classList.add('hidden');

                // 레이아웃 타입을 원래 타입으로 복원
                if (modalContainer.dataset.layoutType !== modalContainer.dataset.originalType) {
                    modalContainer.dataset.layoutType = modalContainer.dataset.originalType;
                    applyLayoutOnly(modalContainer, modalContainer.dataset.originalType);
                }

                // CSS 변수 정리
                modalOverlay.style.removeProperty('--overlay-delay');

                // 모든 모달이 닫히면 body 스크롤 복원
                if (!modalWrapper.querySelector('.modal-container:not(.hidden)')) {
                    document.body.classList.remove('overflow-hidden');
                }
            }, timeoutDuration);
        });
    };

    /*
     * =================================================================
     * 이벤트 리스너
     * =================================================================
     */

    /**
     * 모달 열기 버튼 클릭 이벤트 바인딩
     * 
     * [무엇을] 각 트리거 버튼에 클릭 이벤트 리스너를 등록
     * [왜] 사용자가 버튼을 클릭했을 때 해당 타입의 모달을 표시하기 위함
     * [어떻게] data-modal-type 속성값을 읽어 openModal 함수에 전달
     * [언제] DOM 로드 완료 후 즉시 모든 버튼에 이벤트 바인딩
     * [누가] 웹페이지 방문자가 버튼을 클릭하여 모달을 열 수 있음
     * [어디서] .modal-trigger 클래스를 가진 모든 버튼 요소에 적용
     */
    triggerButtons.forEach(button => {
        button.addEventListener('click', () => openModal(button.dataset.modalType));
    });

    /**
     * 모달 닫기 관련 클릭 이벤트 위임 처리
     * 
     * [무엇을] 모달 래퍼에 단일 이벤트 리스너로 모든 닫기 동작을 처리
     * [왜] 이벤트 위임으로 성능을 최적화하고 동적 생성된 요소도 처리 가능
     * [어떻게] 클릭된 요소를 확인하여 오버레이/닫기버튼/확인버튼 구분 처리
     * [언제] 사용자가 모달 영역 내 특정 요소를 클릭할 때마다 실행
     * [누가] 모달을 닫고자 하는 사용자의 클릭 동작을 감지
     * [어디서] #modal-wrapper 내부의 모든 클릭 이벤트를 모니터링
     */
    modalWrapper.addEventListener('click', (e) => {
        // 오버레이 클릭
        if (e.target.classList.contains('modal-overlay')) {
            closeModal(e.target.parentElement);
            return;
        }

        // 닫기 버튼 또는 확인 버튼 클릭
        const button = e.target.closest('.modal-close-btn, .modal-ok-btn');
        if (button) {
            const modalContainer = button.closest('.modal-container');
            if (modalContainer) closeModal(modalContainer);
        }
    });

    /**
     * ESC 키 입력으로 모달 닫기
     * 
     * [무엇을] 키보드 ESC 키 입력을 감지하여 현재 열린 모달을 닫음
     * [왜] 키보드 사용자의 접근성과 빠른 모달 닫기 UX를 제공
     * [어떻게] keydown 이벤트에서 Escape 키를 확인하고 표시된 모달을 찾아 닫음
     * [언제] 모달이 열려있는 상태에서 사용자가 ESC 키를 누를 때
     * [누가] 키보드를 선호하는 사용자나 빠른 닫기를 원하는 사용자
     * [어디서] window 전역에서 모든 키 입력을 모니터링
     */
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const visibleModal = modalWrapper.querySelector('.modal-container:not(.hidden)');
            if (visibleModal) closeModal(visibleModal);
        }
    });

    /**
     * 브라우저 창 크기 변경 시 모달 레이아웃 동적 조정
     * 
     * [무엇을] 윈도우 리사이즈 이벤트를 감지하여 모바일 모달의 레이아웃을 재조정
     * [왜] 화면 크기 변경 시 콘텐츠가 잘리거나 스크롤이 필요한 경우를 대응
     * [어떻게] 150ms 디바운싱으로 리사이즈 완료 후 한 번만 처리
     * [언제] 사용자가 브라우저 창 크기를 조정하거나 기기 방향을 변경할 때
     * [누가] 시스템이 자동으로 감지하여 최적 레이아웃으로 조정
     * [어디서] 현재 표시 중인 모달이 있다면 checkAndAdjustModalType 호출
     */
    const handleResize = () => {
        const visibleModal = modalWrapper.querySelector('.modal-container:not(.hidden)');
        if (visibleModal) {
            checkAndAdjustModalType(visibleModal);
        }
    };

    window.addEventListener('resize', () => {
        clearTimeout(resizeDebounceTimer);
        resizeDebounceTimer = setTimeout(handleResize, 150);
    });
}); 