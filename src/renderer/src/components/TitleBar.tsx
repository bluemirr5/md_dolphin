// TitleBar — hiddenInset 타이틀 바 영역 드래그 핸들 + 사이드바 토글 호스트
// 신호등(좌측 ~12-72px)을 침범하지 않도록 토글은 left: 84px 부근에 배치
// -webkit-app-region: drag 영역에서 버튼은 no-drag로 클릭 가능
import { SidebarToggleButton } from './SidebarToggleButton';

export function TitleBar(): JSX.Element {
  return (
    <div className="md-titlebar" role="presentation">
      <SidebarToggleButton />
    </div>
  );
}
