function onOpen() {
  const menu = SpreadsheetApp.getUi().createMenu('Deadlock');
  onOpen_HeroStats(menu);
  onOpen_Buildups(menu);
  menu.addToUi();
}