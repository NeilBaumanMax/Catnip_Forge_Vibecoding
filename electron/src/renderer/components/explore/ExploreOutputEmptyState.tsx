import React from 'react';
import { BookOpenCheck, FileText, FolderOpen, Lightbulb, MessageCircle, ScanSearch, Search, Sparkles, Target } from 'lucide-react';
import exploreIdeaWorkspace from '../../assets/explore-idea-workspace.png';
import exploreDiagnosisWorkspace from '../../assets/explore-diagnosis-workspace.png';

interface Props {
  mode: 'idea' | 'diagnosis';
}

// Static onboarding for an empty output pane. Stage and request state stay in ExplorePanel.
export default function ExploreOutputEmptyState({ mode }: Props) {
  if (mode === 'idea') {
    return (
      <div className="explore-idea-empty-shell">
        <section className="explore-idea-visual" aria-label="知乎灵感探索说明">
          <img src={exploreIdeaWorkspace} alt="学院呱呱在深蓝研究工作室里使用电脑寻找灵感" />
          <div className="explore-idea-visual-copy">
            <span>EXPLORE ON ZHIHU</span>
            <h3>从真实的讨论中<br />找到你的<span>灵感</span></h3>
            <ul>
              <li><MessageCircle aria-hidden="true" /><div><strong>搜索相关话题与案例</strong><small>基于你的想法，在知乎中查找相关讨论</small></div></li>
              <li><BookOpenCheck aria-hidden="true" /><div><strong>提炼有价值的观点</strong><small>AI 帮你整理核心经验和思路</small></div></li>
              <li><Sparkles aria-hidden="true" /><div><strong>转化为可执行的灵感</strong><small>结合你的项目条件，生成具体参考方向</small></div></li>
            </ul>
          </div>
        </section>
        <section className="explore-idea-empty-summary">
          <header><Sparkles aria-hidden="true" /><div><strong>探索结果将在这里展开</strong><p>输入目标后，AI 将在知乎搜索相关内容，并以结构化的方式呈现给你。</p></div></header>
          <div>
            <span><Search aria-hidden="true" /><strong>相关话题</strong><small>知乎高质量问答与讨论</small></span>
            <span><FileText aria-hidden="true" /><strong>观点提炼</strong><small>AI 总结关键信息</small></span>
            <span><Lightbulb aria-hidden="true" /><strong>灵感建议</strong><small>结合项目的可执行方向</small></span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="explore-diagnosis-empty-shell">
      <section className="explore-diagnosis-visual" aria-label="工程问题分析说明">
        <img src={exploreDiagnosisWorkspace} alt="学院呱呱在深蓝工程工作室中使用放大镜分析代码和运行状态" />
        <div className="explore-diagnosis-visual-copy">
          <span>CATNIP FORGE</span>
          <h3>把复杂问题拆解成<br /><em>可执行的答案</em></h3>
          <strong><Sparkles aria-hidden="true" />工程证据 + 经验资料 + AI 分析</strong>
          <ul>
            <li><FolderOpen aria-hidden="true" /><div><b>读取工程上下文</b><small>分析工程配置、代码结构与开发板状态</small></div></li>
            <li><FileText aria-hidden="true" /><div><b>结合源码与日志</b><small>综合 Build / Flash / 串口等多维线索</small></div></li>
            <li><Target aria-hidden="true" /><div><b>定位可能根因</b><small>对照经验知识库，给出可信的原因判断</small></div></li>
            <li><Lightbulb aria-hidden="true" /><div><b>生成排查建议</b><small>提供具体、可执行的解决方案</small></div></li>
          </ul>
        </div>
      </section>
      <section className="explore-diagnosis-empty-summary">
        <header><FileText aria-hidden="true" /><div><strong>调查报告将在这里展开</strong><p>基于你的问题，AI 将结合工程证据、社区经验、外部资料与来源冲突交叉呈现。</p></div></header>
        <div>
          <span><Search aria-hidden="true" /><strong>问题线索</strong><small>整理关键现象、日志片段<br />和相关代码位置。</small></span>
          <span><ScanSearch aria-hidden="true" /><strong>原因判断</strong><small>分析可能的根本原因，<br />并给出依据与置信度。</small></span>
          <span><Lightbulb aria-hidden="true" /><strong>排查建议</strong><small>提供具体的操作步骤<br />和验证方法。</small></span>
        </div>
      </section>
    </div>
  );
}
