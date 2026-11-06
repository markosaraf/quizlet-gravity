import UIKit

/// Uses the same card positions, easing and complete passes as Android's LogoCarouselView.
final class IntroView: UIView {
    private enum Phase { case starting, carousel, morph, holding, fading, finished }
    private let carousel = LogoCarouselView()
    private let title = UILabel()
    private let message = UILabel()
    private let retry = UIButton(type: .system)
    private var displayLink: CADisplayLink?
    private var lastTimestamp: CFTimeInterval?
    private var elapsed: TimeInterval = 0
    private var phase = Phase.starting
    private var passStart: CGFloat = 0
    private var passSteps: CGFloat = 2
    private var ready = false
    private var failed = false
    private var started = false
    private var isSceneActive: Bool { window?.windowScene?.activationState == .foregroundActive }
    var onRetry: (() -> Void)?
    var onReveal: (() -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor(red: 66/255, green: 85/255, blue: 1, alpha: 1)
        addSubview(carousel)
        title.text = "Quizlet Gravity"
        title.textColor = .white
        title.font = .boldSystemFont(ofSize: 28)
        title.textAlignment = .center
        title.adjustsFontSizeToFitWidth = true
        title.minimumScaleFactor = 0.75
        message.textColor = .white
        message.textAlignment = .center
        message.numberOfLines = 0
        message.font = .preferredFont(forTextStyle: .body)
        retry.setTitle("Try again", for: .normal)
        retry.tintColor = .white
        retry.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        retry.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        [title, message, retry].forEach { addSubview($0) }
        message.isHidden = true
        retry.isHidden = true
        accessibilityViewIsModal = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        // Android uses a 200-point carousel followed by the title, with 28-point margins.
        carousel.frame = CGRect(x: 28, y: bounds.midY - 120, width: max(0, bounds.width - 56), height: 200)
        title.frame = CGRect(x: 20, y: carousel.frame.maxY, width: bounds.width - 40, height: 40)
        message.frame = CGRect(x: 24, y: title.frame.maxY + 12, width: bounds.width - 48, height: 64)
        retry.frame = CGRect(x: 24, y: message.frame.maxY, width: bounds.width - 48, height: 48)
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window == nil { pause() } else { resume() }
    }

    func start() {
        guard !started else { return }
        started = true
        let target = DisplayLinkTarget(self)
        let link = CADisplayLink(target: target, selector: #selector(DisplayLinkTarget.tick(_:)))
        link.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 60, preferred: 60)
        displayLink = link
        link.add(to: .main, forMode: .common)
        link.isPaused = !isSceneActive
    }

    func pageReady() { ready = true }

    fileprivate func tick(_ link: CADisplayLink) {
        guard started, !failed, phase != .finished else { return }
        defer { lastTimestamp = link.targetTimestamp }
        guard let previous = lastTimestamp else { return }
        // Don't skip artwork after a long main-thread stall during WebKit startup.
        elapsed += min(0.1, max(0, link.targetTimestamp - previous))
        if UIAccessibility.isReduceMotionEnabled {
            carousel.showOriginal = true
            carousel.setNeedsDisplay()
            if ready { finish() }
            return
        }
        switch phase {
        case .starting:
            if elapsed >= 0.67 {
                advance(to: .carousel)
                carousel.showOriginal = false
            }
        case .carousel:
            let raw = passStart + min(passSteps, CGFloat(elapsed / 0.8))
            let whole = floor(raw)
            let fraction = raw - whole
            carousel.position = whole + fraction * fraction * (3 - 2 * fraction)
            if elapsed >= Double(passSteps) * 0.8 {
                carousel.position = passStart + passSteps
                if ready {
                    advance(to: .morph)
                    carousel.isMorphing = true
                } else {
                    // First pass ends on white after two slides; repeat all three if needed.
                    passStart = carousel.position
                    passSteps = 3
                    elapsed = 0
                }
            }
        case .morph:
            let progress = min(1, elapsed / 0.55)
            carousel.morph = CGFloat((1 - cos(.pi * progress)) / 2)
            if progress >= 1 {
                carousel.showOriginal = true
                advance(to: .holding)
            }
        case .holding:
            if elapsed >= 1 { advance(to: .fading) }
        case .fading:
            let progress = min(1, elapsed / 0.65)
            alpha = CGFloat((1 + cos(.pi * progress)) / 2)
            if progress >= 1 { finish() }
        case .finished: break
        }
        carousel.setNeedsDisplay()
    }

    private func advance(to next: Phase) { phase = next; elapsed = 0 }

    private func finish() {
        phase = .finished
        stop()
        onReveal?()
    }

    func pause() { displayLink?.isPaused = true; lastTimestamp = nil }
    func resume() {
        guard started, !failed else { return }
        lastTimestamp = nil
        displayLink?.isPaused = !isSceneActive
    }
    func stop() {
        displayLink?.invalidate()
        displayLink = nil
        lastTimestamp = nil
    }

    func showError() {
        failed = true
        stop()
        alpha = 1
        carousel.showOriginal = true
        carousel.setNeedsDisplay()
        message.text = "The game couldn’t load. Check your internet connection and try again."
        message.isHidden = false
        retry.isHidden = false
        UIAccessibility.post(notification: .screenChanged, argument: message)
    }

    @objc private func retryTapped() { onRetry?() }
    deinit { displayLink?.invalidate() }
}

/// CADisplayLink retains its target; keep the view weak so removing an intro releases it.
private final class DisplayLinkTarget: NSObject {
    weak var view: IntroView?
    init(_ view: IntroView) { self.view = view }
    @objc func tick(_ link: CADisplayLink) { view?.tick(link) }
}

private final class LogoCarouselView: UIView {
    private let originals = ["LogoGoldBackground", "LogoBlack", "LogoWhite"].map { UIImage(named: $0)! }
    private let gold = UIImage(named: "LogoGold")!
    var showOriginal = true
    var position: CGFloat = 0
    var isMorphing = false
    var morph: CGFloat = 0

    init() {
        super.init(frame: .zero)
        isOpaque = false
        isAccessibilityElement = false
        contentMode = .redraw
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func draw(_ rect: CGRect) {
        let size = min(CGFloat(156), bounds.width * 0.5)
        let spacing = min(CGFloat(112), bounds.width * 0.35)
        func cardRect(x: CGFloat, size: CGFloat) -> CGRect {
            CGRect(x: x - size / 2, y: bounds.midY - size / 2, width: size, height: size)
        }
        if showOriginal {
            gold.draw(in: cardRect(x: bounds.midX, size: size))
            return
        }
        let nearest = Int(position.rounded())
        let cards = Array((nearest - 2)...(nearest + 2)).sorted {
            abs(CGFloat($0) - position) > abs(CGFloat($1) - position)
        }
        for index in cards {
            let distance = CGFloat(index) - position
            var opacity = max(0, 1 - abs(distance) * 0.62)
            let scale = max(0.56, 1 - abs(distance) * 0.30)
            var x = bounds.midX + distance * spacing
            if isMorphing && index != nearest {
                opacity *= 1 - morph
                x = bounds.midX + distance * spacing * (1 - morph * 0.6)
            }
            guard opacity > 0 else { continue }
            let frame = cardRect(x: x, size: size * scale)
            let palette = (index % 3 + 3) % 3
            originals[palette].draw(in: frame, blendMode: .normal, alpha: opacity)
            if isMorphing && index == nearest {
                // The white and gold artwork share the same indigo square and path.
                gold.draw(in: frame, blendMode: .normal, alpha: morph)
            }
        }
    }
}
