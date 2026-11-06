package com.quizletgravity.android;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ArgbEvaluator;
import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.LinearInterpolator;

import androidx.core.graphics.PathParser;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Draws the supplied square SVGs directly, using their original path and layout. */
final class LogoCarouselView extends View {
    private static final int INDIGO = Color.rgb(66, 85, 255);
    private static final int GOLD = Color.rgb(212, 175, 55);
    private static final long START_DELAY_MS = 670L;
    private static final int[] BACKGROUNDS = {GOLD, INDIGO, INDIGO};
    private static final int[] FOREGROUNDS = {INDIGO, Color.BLACK, Color.WHITE};
    private enum Phase { STARTING, CAROUSEL, MORPH, FINAL }

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path q;
    private final ArgbEvaluator colors = new ArgbEvaluator();
    private ValueAnimator motion;
    private Phase phase = Phase.FINAL;
    private float position;
    private float morph = 1f;
    private boolean ready;
    private boolean paused;
    private Runnable onFinalLogo;

    LogoCarouselView(Context context) {
        super(context);
        q = PathParser.createPathFromPathData(getResources().getString(R.string.logo_q_path));
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
    }

    void start(Runnable onFinalLogo) {
        stop();
        this.onFinalLogo = onFinalLogo;
        ready = false;
        position = 0f;
        morph = 0f;
        phase = Phase.STARTING;
        if (ValueAnimator.areAnimatorsEnabled()) slide(2, START_DELAY_MS);
        else settleWithoutMotion();
        invalidate();
    }

    void setPageReady() {
        ready = true;
        // Normally finish at the end of a carousel pass, not halfway through a slide.
        if (phase == Phase.FINAL) deliverFinalLogo();
    }

    private void slide(int steps, long startDelay) {
        if (!ValueAnimator.areAnimatorsEnabled()) { settleWithoutMotion(); return; }
        float start = position;
        motion = ValueAnimator.ofFloat(start, start + steps);
        motion.setStartDelay(startDelay);
        motion.setDuration(800L * steps);
        motion.setInterpolator(new LinearInterpolator());
        motion.addUpdateListener(animation -> {
            float raw = (float) animation.getAnimatedValue();
            float whole = (float) Math.floor(raw);
            float fraction = raw - whole;
            // Continuous velocity through each slide; no jump between carousel passes.
            position = whole + fraction * fraction * (3f - 2f * fraction);
            invalidate();
        });
        motion.addListener(new AnimatorListenerAdapter() {
            @Override public void onAnimationStart(Animator animation) {
                // The delay shows the original single logo, not frozen carousel cards.
                phase = Phase.CAROUSEL;
                invalidate();
            }
            @Override public void onAnimationEnd(Animator animation) {
                motion = null;
                if (ready) morphToGold();
                else slide(3, 0); // All three alternatives, ending on white-on-indigo again.
            }
        });
        motion.start();
        if (paused && motion != null) motion.pause();
    }

    private void morphToGold() {
        if (!ValueAnimator.areAnimatorsEnabled()) { settleWithoutMotion(); return; }
        phase = Phase.MORPH;
        motion = ValueAnimator.ofFloat(0f, 1f);
        motion.setDuration(550);
        motion.setInterpolator(new AccelerateDecelerateInterpolator());
        motion.addUpdateListener(animation -> {
            morph = (float) animation.getAnimatedValue();
            invalidate();
        });
        motion.addListener(new AnimatorListenerAdapter() {
            @Override public void onAnimationEnd(Animator animation) {
                motion = null;
                phase = Phase.FINAL;
                morph = 1f;
                invalidate();
                deliverFinalLogo();
            }
        });
        motion.start();
        if (paused && motion != null) motion.pause();
    }

    private void settleWithoutMotion() {
        phase = Phase.FINAL;
        morph = 1f;
        invalidate();
        if (ready) deliverFinalLogo();
    }

    private void deliverFinalLogo() {
        if (onFinalLogo == null) return;
        Runnable callback = onFinalLogo;
        onFinalLogo = null;
        callback.run();
    }

    void pauseMotion() {
        paused = true;
        if (motion != null) motion.pause();
    }

    void resumeMotion() {
        paused = false;
        if (motion != null) motion.resume();
    }

    void stop() {
        if (motion != null) {
            motion.removeAllListeners();
            motion.removeAllUpdateListeners();
            motion.cancel();
            motion = null;
        }
        onFinalLogo = null;
        phase = Phase.FINAL;
        morph = 1f;
        invalidate();
    }

    @Override protected void onDetachedFromWindow() { stop(); super.onDetachedFromWindow(); }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float density = getResources().getDisplayMetrics().density;
        float size = Math.min(156 * density, getWidth() * 0.50f);
        float spacing = Math.min(112 * density, getWidth() * 0.35f);
        float cx = getWidth() / 2f;
        float cy = getHeight() / 2f;
        if (phase == Phase.STARTING || phase == Phase.FINAL) {
            drawChip(canvas, cx, cy, size, INDIGO, GOLD, 1f);
            return;
        }
        List<Integer> cards = new ArrayList<>(5);
        int nearest = Math.round(position);
        for (int index = nearest - 2; index <= nearest + 2; index++) cards.add(index);
        // Draw the centred chip last so it stays in front of its neighbours.
        cards.sort(Comparator.comparingDouble((Integer index) -> -Math.abs(index - position)));
        for (int index : cards) {
            float distance = index - position;
            float absolute = Math.abs(distance);
            float opacity = Math.max(0, 1f - absolute * 0.62f);
            float scale = Math.max(0.56f, 1f - absolute * 0.30f);
            float x = cx + distance * spacing;
            int palette = Math.floorMod(index, BACKGROUNDS.length);
            int foreground = FOREGROUNDS[palette];
            if (phase == Phase.MORPH) {
                if (index == nearest) foreground = (int) colors.evaluate(morph, Color.WHITE, GOLD);
                else {
                    opacity *= 1f - morph;
                    x = cx + distance * spacing * (1f - morph * 0.6f);
                }
            }
            if (opacity > 0) drawChip(canvas, x, cy, size * scale,
                    BACKGROUNDS[palette], foreground, opacity);
        }
    }

    private void drawChip(Canvas canvas, float cx, float cy, float size,
                          int background, int foreground, float opacity) {
        canvas.save();
        canvas.translate(cx - size / 2f, cy - size / 2f);
        canvas.scale(size / 31.2f, size / 31.2f);
        paint.setColor(background);
        paint.setAlpha(Math.round(opacity * 255));
        canvas.drawRect(0, 0, 31.2f, 31.2f, paint);
        canvas.translate(7.2f, 7.2f);
        canvas.scale(0.7f, 0.7f);
        paint.setColor(foreground);
        paint.setAlpha(Math.round(opacity * 255));
        canvas.drawPath(q, paint);
        canvas.restore();
    }
}
