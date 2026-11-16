import java.util.Properties

plugins { id("com.android.application"); id("com.google.gms.google-services") }

val signingPath = providers.environmentVariable("QUIZLETGRAVITY_SIGNING_PROPERTIES").orNull
val signing = Properties().apply {
    if (signingPath != null) file(signingPath).inputStream().use { load(it) }
}

android {
    namespace = "com.quizletgravity.android"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.quizletgravity.android"
        minSdk = 26
        targetSdk = 36
        versionCode = 25
        versionName = "2.0.13"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { buildConfig = true }
    if (signingPath != null) {
        signingConfigs.create("distribution") {
            storeFile = file(signing.getProperty("storeFile"))
            storePassword = signing.getProperty("storePassword")
            keyAlias = signing.getProperty("keyAlias")
            keyPassword = signing.getProperty("keyPassword")
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (signingPath != null) signingConfig = signingConfigs.getByName("distribution")
        }
    }
    lint { abortOnError = true }
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:35.2.0"))
    implementation("com.google.firebase:firebase-messaging")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.activity:activity:1.10.1")
    // Firebase brings Fragment 1.1; Activity Result APIs require a modern version.
    implementation("androidx.fragment:fragment:1.8.9")
    implementation("androidx.browser:browser:1.10.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    testImplementation("junit:junit:4.13.2")
}
