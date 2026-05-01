cask "md-dolphin" do
  version "0.11.1"  # i18next chunk split 적용 첫 릴리스
  sha256 :no_check  # TODO: v0.11.1 DMG 발사 후 64자 hex SHA256으로 교체

  url "https://github.com/bluemirr5/md_dolphin/releases/download/v#{version}/md_dolphin-#{version}-mac-universal.dmg"
  name "md_dolphin"
  desc "macOS markdown viewer"
  homepage "https://github.com/bluemirr5/md_dolphin"

  auto_updates false

  livecheck do
    url :homepage
    strategy :github_latest
  end

  depends_on macos: ">= :monterey"

  app "md_dolphin.app"

  zap trash: [
    "~/Library/Application Support/md_dolphin",
    "~/Library/Preferences/com.bluemirr5.md-dolphin.plist",
    "~/Library/Logs/md_dolphin",
  ]
end
