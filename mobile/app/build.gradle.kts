import java.util.Properties

plugins { id("com.android.application") }

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
        versionCode = 17
        versionName = "2.0.6"
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
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.activity:activity:1.10.1")
    implementation("androidx.browser:browser:1.10.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    testImplementation("junit:junit:4.13.2")
}
