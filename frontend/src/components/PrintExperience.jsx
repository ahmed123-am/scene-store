import React, { useEffect, useRef, useState } from 'react';

const stages = [
  {
    title: 'كل مجسم بيبدأ بفكرة.',
    description: 'انزل وشوف سين بتاخد شكلها.',
  },
  {
    title: 'طبقة فوق طبقة.',
    description: 'التفاصيل الصغيرة بتبني الشكل كله.',
  },
  {
    title: 'الفكرة بقت بين إيديك.',
    description: 'اكتشف مجسمات SCÈNE.',
  },
];

export default function PrintExperience() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  const [stage, setStage] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    let frame = 0;
    let progress = 0;

    function seekVideo() {
      if (
        !Number.isFinite(video.duration) ||
        video.readyState < 1 ||
        video.seeking
      ) {
        return;
      }

      const endTime = Math.max(0, video.duration - 0.05);

      const targetTime = motionPreference.matches
        ? endTime
        : progress * endTime;

      if (Math.abs(video.currentTime - targetTime) > 0.035) {
        video.currentTime = targetTime;
      }
    }

    function updateScene() {
      frame = 0;

      const bounds = section.getBoundingClientRect();
      const scrollDistance = Math.max(
        1,
        bounds.height - window.innerHeight,
      );

      progress = Math.max(
        0,
        Math.min(1, -bounds.top / scrollDistance),
      );

      section.style.setProperty('--progress', String(progress));

      const nextStage = motionPreference.matches
        ? stages.length - 1
        : Math.min(
            stages.length - 1,
            Math.floor(progress * stages.length),
          );

      setStage(nextStage);
      seekVideo();
    }

    function scheduleUpdate() {
      if (!frame) {
        frame = window.requestAnimationFrame(updateScene);
      }
    }

    window.addEventListener('scroll', scheduleUpdate, {
      passive: true,
    });
    window.addEventListener('resize', scheduleUpdate);

    motionPreference.addEventListener('change', scheduleUpdate);
    video.addEventListener('loadeddata', scheduleUpdate);
    video.addEventListener('seeked', seekVideo);

    scheduleUpdate();

    return () => {
      window.cancelAnimationFrame(frame);

      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);

      motionPreference.removeEventListener('change', scheduleUpdate);
      video.removeEventListener('loadeddata', scheduleUpdate);
      video.removeEventListener('seeked', seekVideo);
    };
  }, []);

  const currentStage = stages[stage];

  return (
    <section
      className="print-experience"
      ref={sectionRef}
      aria-label="رحلة طباعة سين"
    >
      <div className="print-stage">
        <div className="print-copy">
          <span className="eyebrow">من فكرة لمجسم</span>

          <h1>{currentStage.title}</h1>
          <p>{currentStage.description}</p>

          <a className="button" href="#collection">
            شوف المجموعة
          </a>
        </div>

        <video
          ref={videoRef}
          className="print-video"
          src="/scene-print.mp4"
          preload="auto"
          muted
          playsInline
          aria-label="ماكينة ثلاثية الأبعاد بتطبع سين"
          onError={() => setFailed(true)}
        />

        {failed && (
          <p className="video-error" role="status">
            تعذّر تحميل مشهد الطباعة. تقدر تكمل للمجموعة.
          </p>
        )}

        <div className="print-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}