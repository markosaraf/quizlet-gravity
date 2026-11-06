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
target.build_configurations.each do |config|
  config.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.quizletgravity.ios',
    'PRODUCT_NAME' => 'QuizletGravity',
    'MARKETING_VERSION' => '1.2.7',
    'CURRENT_PROJECT_VERSION' => '12',
    'INFOPLIST_FILE' => 'QuizletGravity/Info.plist',
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
    'CODE_SIGN_STYLE' => 'Automatic',
    'ENABLE_USER_SCRIPT_SANDBOXING' => 'YES',
    'GENERATE_INFOPLIST_FILE' => 'NO',
    'IPHONEOS_DEPLOYMENT_TARGET' => '16.0',
    'SUPPORTS_MACCATALYST' => 'NO',
    'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks']
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.archive_action.build_configuration = 'Release'
scheme.save_as(project.path, 'QuizletGravity', true)
