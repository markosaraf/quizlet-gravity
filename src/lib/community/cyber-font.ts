export type CyberMode = 'off' | 'interface' | 'all';
export type CyberSettings = {cyberNonQuizletEnabled:boolean;cyberLogoEnabled:boolean;cyberAllEnabled:boolean};
export const defaultCyberSettings:CyberSettings={cyberNonQuizletEnabled:false,cyberLogoEnabled:false,cyberAllEnabled:false};
export function isCyberMode(value:unknown):value is CyberMode{return value==='off'||value==='interface'||value==='all';}
export function cyberMode(settings:CyberSettings,personal:CyberMode|null):CyberMode{
 if(settings.cyberLogoEnabled&&personal!==null)return personal;
 return settings.cyberAllEnabled?'all':settings.cyberNonQuizletEnabled?'interface':'off';
}
