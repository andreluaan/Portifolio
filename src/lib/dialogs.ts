// The book, the character sheet and the notebook are only built when someone opens them, so their code is fetched
// then too instead of weighing on the first load.
export const openBook = (projectId?: string) => import('./book').then((module) => module.openBook(projectId));
export const openCharacterSheet = () => import('./character').then((module) => module.openCharacterSheet());
export const openNotebook = (onNoteSent?: () => void) => import('./notebook').then((module) => module.openNotebook(onNoteSent));
