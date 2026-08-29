import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Github, MessageSquareText } from "lucide-react";

export const metadata: Metadata = {
  title: "关于我们 · 可露希尔基建终端",
  description: "了解可露希尔基建终端的开发、资料来源与贡献方式。",
};

const sources = [
  { code: "数据资料", title: "arknights-toolbox-data", text: "干员、基建技能与术语数据", tags: "干员数据 · 基建技能", href: "https://github.com/arkntools/arknights-toolbox-data" },
  { code: "图片资源", title: "ArknightsGameResource", text: "干员立绘与部分游戏图片资源", tags: "干员立绘 · 图片素材", href: "https://github.com/yuanyan3060/ArknightsGameResource" },
  { code: "权利归属", title: "明日方舟官方网站", text: "游戏名称、角色与美术资源权利归属", tags: "官方网站 · 权利归属", href: "https://ak.hypergryph.com/" },
];

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#9ca49e] pb-3 font-number text-xs font-bold text-[#505852]">
      <span className="grid size-7 place-items-center bg-[#d4bc35] text-[#1d211e]">{index}</span>
      <span>{title}</span>
      <span className="ml-auto text-[#727b75]">项目档案</span>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-dvh bg-[#edf0ec] text-[#202521] selection:bg-[#d4bc35] selection:text-[#111411]">
      <header className="border-b border-[#626862] bg-[#202521] text-[#eef0eb]">
        <div className="mx-auto flex min-h-16 max-w-[1320px] items-center justify-between px-5 sm:px-10">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2b529]">
            <ArrowLeft className="size-4" aria-hidden="true" />返回终端
          </Link>
        </div>
      </header>

      <section className="border-b border-[#626862]" aria-labelledby="about-title">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex min-h-[500px] flex-col items-center justify-between bg-[#f7f8f5] px-5 py-10 text-center sm:px-10 sm:py-14">
            <div className="flex w-full flex-col items-center">
              <div className="mt-2 h-1 w-16 bg-[#d4bc35]" aria-hidden="true" />
              <h1 id="about-title" className="mt-6 max-w-3xl text-[clamp(2.75rem,6vw,5rem)] font-black leading-[0.98]">可露希尔<br />基建终端</h1>
              <p className="mt-7 max-w-2xl text-base font-medium leading-8 sm:text-lg">可露希尔基建终端是面向《明日方舟》玩家的非官方排班辅助工具，希望把复杂的基建配置整理成更容易执行和复查的方案。</p>
            </div>
            <div className="mt-12 grid w-full border border-[#7d857f] bg-[#edf0ec] text-center text-sm sm:grid-cols-3">
              {[["类型", "玩家工具"], ["阶段", "Beta"], ["范围", "公开测试"]].map(([label, value], index) => (
                <div key={label} className={`min-h-20 p-3 ${index < 2 ? "border-b border-[#626862] sm:border-b-0 sm:border-r" : ""}`}>
                  <span className="font-number text-xs text-[#686e69]">{label}</span><strong className="mt-3 block">{value}</strong>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <section className="mx-auto max-w-[1320px] border-x border-[#8c948e] bg-[#f7f8f5] px-5 py-14 sm:px-10 sm:py-20" aria-labelledby="sources-title">
        <SectionLabel index="01" title="开发资料和数据来源" />
        <div className="mt-10 grid gap-12 lg:grid-cols-[0.68fr_1.32fr]">
          <div>
            <h2 id="sources-title" className="text-3xl font-black leading-[1.1] sm:text-5xl">数据与资源来源</h2>
            <p className="mt-6 max-w-lg leading-7 text-[#555b56]">项目使用的干员数据、基建技能和图片资源来自以下公开资料。原始链接保留在这里，方便查询和核对。</p>
          </div>
          <div className="border-t border-[#7d857f]">
            {sources.map((source) => (
              <a key={source.code} href={source.href} target="_blank" rel="noreferrer" className="group grid min-h-32 grid-cols-[76px_minmax(0,1fr)_32px] items-center gap-3 border-b border-[#9ca49e] px-2 py-5 transition-colors duration-200 hover:bg-[#e7ebe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4e7f91] sm:grid-cols-[110px_minmax(0,1fr)_40px] sm:px-4">
                <span className="font-number text-xs font-bold text-[#616762]">{source.code}</span>
                <span><strong className="block break-words text-lg sm:text-2xl">{source.title}</strong><span className="mt-2 block text-sm leading-6 text-[#555b56]">{source.text}</span><span className="mt-2 block text-xs font-semibold text-[#4e7f91]">{source.tags}</span></span>
                <ArrowUpRight className="size-5 transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#626862] bg-[#252a27] text-[#edf0ec]" aria-labelledby="contribute-title">
        <div className="mx-auto grid max-w-[1320px] lg:grid-cols-2">
          <div className="px-5 py-14 sm:px-10 sm:py-20 lg:border-r lg:border-[#59615b]">
            <SectionLabel index="02" title="开发与贡献" />
            <h2 id="contribute-title" className="mt-10 max-w-4xl text-4xl font-black leading-[1.08] sm:text-5xl">参与开发</h2>
            <p className="mt-6 max-w-lg leading-7 text-[#b9c0ba]">查看源码和开发进度，也欢迎提交问题、功能建议或改进方案。</p>
          </div>
          <div className="grid border-t border-[#59615b] lg:border-t-0">
            <a href="https://github.com/KnightCodeSquareMatrix/ArknightsInfraCalc-v2_beta_test_frontend" target="_blank" rel="noreferrer" className="group flex min-h-36 items-center justify-between gap-4 border-b border-[#59615b] px-6 font-bold transition-colors duration-200 hover:bg-[#d4bc35] hover:text-[#202521] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#edf0ec]"><span className="flex items-center gap-4"><Github className="size-6" aria-hidden="true" /><span>项目仓库<small className="mt-1 block font-normal text-[#aeb6b0] group-hover:text-[#353b37]">查看源码、提交记录与开发进度</small></span></span><ArrowUpRight className="size-5" aria-hidden="true" /></a>
            <a href="https://github.com/KnightCodeSquareMatrix/ArknightsInfraCalc-v2_beta_test_frontend/issues" target="_blank" rel="noreferrer" className="group flex min-h-36 items-center justify-between gap-4 px-6 font-bold transition-colors duration-200 hover:bg-[#4e7f91] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#edf0ec]"><span className="flex items-center gap-4"><MessageSquareText className="size-6" aria-hidden="true" /><span>问题与建议<small className="mt-1 block font-normal text-[#aeb6b0] group-hover:text-white">提交问题、功能建议或改进方案</small></span></span><ArrowUpRight className="size-5" aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] border-x border-[#8c948e] bg-[#f7f8f5] px-5 py-14 sm:px-10 sm:py-20" aria-labelledby="people-title">
        <SectionLabel index="03" title="贡献者与赞助者" />
        <h2 id="people-title" className="mt-10 text-3xl font-black leading-[1.1] sm:text-5xl">感谢参与项目的人</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="min-h-48 border border-[#9ca49e] bg-[#edf0ec] p-6 shadow-[5px_5px_0_#d1d6d1] sm:p-8">
            <span className="text-xs font-bold text-[#4e7f91]">贡献者名单</span>
            <h3 className="mt-8 text-2xl font-bold">持续补充中</h3>
            <p className="mt-4 leading-7 text-[#555b56]">这里将展示参与开发、资料整理和测试的贡献者。</p>
          </article>
          <article className="min-h-48 border border-[#9ca49e] bg-[#edf0ec] p-6 shadow-[5px_5px_0_#d1d6d1] sm:p-8">
            <span className="text-xs font-bold text-[#4e7f91]">赞助者名单</span>
            <h3 className="mt-8 text-2xl font-bold">暂未开放</h3>
            <p className="mt-4 leading-7 text-[#555b56]">赞助功能尚未开放，后续信息以项目公告为准。</p>
          </article>
        </div>
      </section>

      <footer className="bg-[#202521] px-4 py-8 text-[#c8cdc8] sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-5 text-sm sm:flex-row sm:items-center">
          <p className="max-w-2xl leading-6">这是玩家制作的非官方、非商业工具。游戏内容及相关素材权利归鹰角网络所有。</p>
          <div className="flex gap-5"><Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/terms">服务条款</Link><Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/privacy">隐私政策</Link></div>
        </div>
      </footer>
    </main>
  );
}
