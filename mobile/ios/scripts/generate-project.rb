require 'xcodeproj'
root = File.expand_path('..', __dir__)
project = Xcodeproj::Project.new(File.join(root, 'QuizletGravity.xcodeproj'))
project.root_object.attributes['LastUpgradeCheck'] = '2600'
target = project.new_target(:application, 'QuizletGravity', :ios, '16.0')
group = project.main_group.new_group('QuizletGravity', 'QuizletGravity')
Dir[File.join(root, 'QuizletGravity', '*.swift')].sort.each do |file|
  target.source_build_phase.add_file_reference(group.new_file(File.basename(file)))
end
%w[Assets.xcassets LaunchScreen.storyboard PrivacyInfo.xcprivacy AppFooter.js].each do |file|
  target.resources_build_phase.add_file_reference(group.new_file(file))
end
group.new_file('Info.plist')
group.new_file('Mac.entitlements')
target.build_configurations.each do |config|
  config.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.quizletgravity.ios',
    'PRODUCT_NAME' => 'QuizletGravity',
    'MARKETING_VERSION' => '2.0.1',
    'CURRENT_PROJECT_VERSION' => '16',
    'INFOPLIST_FILE' => 'QuizletGravity/Info.plist',
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1,2,6',
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
    'CODE_SIGN_STYLE' => 'Automatic',
    'ENABLE_USER_SCRIPT_SANDBOXING' => 'YES',
    'GENERATE_INFOPLIST_FILE' => 'NO',
    'IPHONEOS_DEPLOYMENT_TARGET' => '16.0',
    'SUPPORTS_MACCATALYST' => 'YES',
    'DERIVE_MACCATALYST_PRODUCT_BUNDLE_IDENTIFIER' => 'NO',
    'CODE_SIGN_ENTITLEMENTS[sdk=macosx*]' => 'QuizletGravity/Mac.entitlements',
    'ENABLE_APP_SANDBOX[sdk=macosx*]' => 'YES',
    'DEVELOPMENT_TEAM' => 'K2273P6PJC',
    'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks']
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.archive_action.build_configuration = 'Release'
scheme.save_as(project.path, 'QuizletGravity', true)
