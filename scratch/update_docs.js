const fs = require('fs');

const date = '25 Juin 2026';
const session = 'Session 32';

// 1. UPDATE AUDIT.MD
let audit = fs.readFileSync('audit.md', 'utf8');
const newAudit = `### Session 32 (${date}) : UX Mobile Money, Passerelle SMS & Sécurité Anti-Fraude 🛡️

> **Contexte :** Résoudre les bugs de non-validation des paiements Orange Money, améliorer l'UX du paiement pour éviter les erreurs d'ordre, et combler une faille de sécurité majeure (Spoofing).

#### Fonctionnalités Ajoutées / Corrigées
*   **Correction Analyseur SMS (Regex) Orange Money :**
    *   Mise à jour des expressions régulières dans \`smsAutoStart.ts\` et \`smsParser.ts\` pour supporter le nouveau format d'Orange Money (utilisation de "Ar" au lieu de "Ariary" et gestion des ID de transaction avec points ex: \`PP260625.1444.D59762\`).
*   **Bouclier Sécurité Anti-Usurpation (Spoofing) 🛡️ :**
    *   Implémentation d'un contrôle strict du \`Sender ID\` (l'expéditeur). L'application rejette silencieusement tout SMS de paiement dont l'expéditeur contient des chiffres (ex: \`034...\` ou \`+261...\`), garantissant que seuls les SMS officiels "MVola", "OrangeMoney", ou "Airtel" sont acceptés, bloquant ainsi les SMS frauduleux envoyés par des particuliers.
*   **Refonte UX du Parcours de Paiement :**
    *   Séparation du processus en 2 étapes claires pour forcer la mise en attente *avant* l'envoi d'argent.
    *   Étape 1 : Le Modal de paiement demande uniquement le numéro de téléphone.
    *   Étape 2 : L'écran de la réservation bascule en "Action Requise" affichant les montants, les numéros de dépôt, et un message de courtoisie expliquant l'utilité des frais de 10% pour l'entretien de la plateforme.
*   **Optimisation Instant Profile :**
    *   Préchargement des données (\`AsyncStorage\`) au \`login\` pour un affichage 100% instantané du profil sans délai.

---

`;
audit = audit.replace('## 📅 Historique des Audits & Résolutions\n', `## 📅 Historique des Audits & Résolutions\n\n${newAudit}`);
fs.writeFileSync('audit.md', audit);

// 2. UPDATE README.MD
let readme = fs.readFileSync('README.md', 'utf8');
readme = readme.replace('### 8. Système de Paiement Mobile Money *(STABLE - SESSION 19)*', '### 8. Système de Paiement Mobile Money *(AMÉLIORÉ - SESSION 32)*');
const newPaymentFeatures = `- **Bouclier Anti-Usurpation (Spoofing) 🛡️ *(NOUVEAU - S32)* :** Rejet automatique des faux SMS de paiement envoyés depuis des numéros de téléphone standards. Vérification stricte du Sender ID opérateur.\n- **UX Paiement Séquentiel *(NOUVEAU - S32)* :** Parcours repensé (Validation Numéro → Instructions) avec affichage persistant des numéros de transfert et note de courtoisie.`;
readme = readme.replace('- **Table `sms_logs` :', `${newPaymentFeatures}\n- **Table \`sms_logs\` :`);
readme = readme.replace(/\*Dernière mise à jour : \*\*.*?\*\* — Session 30.*?\*/g, `*Dernière mise à jour : **${date}** — Session 32 : UX Mobile Money, Anti-Fraude SMS.*`);
fs.writeFileSync('README.md', readme);

// 3. UPDATE PLAN.MD
let plan = fs.readFileSync('plan.md', 'utf8');
plan = plan.replace(/\*Dernière mise à jour : \*\*.*?\*\* — Session 30.*?\*/g, `*Dernière mise à jour : **${date}** — Session 32 : UX Mobile Money, Anti-Fraude SMS.*`);
const planUpdate = `*   **Anti-Fraude SMS & UX Paiement (S32) 🛡️💳 :** Création d'un bouclier anti-spoofing bloquant les SMS frauduleux (Sender ID contenant des chiffres). Refonte de l'UX de paiement en 2 étapes pour garantir que la réservation est "en attente" avant le transfert de fonds. Mise à jour des Regex Orange Money.`;
plan = plan.replace('### Phase 3 : Fiabilité & Mode Offline', `${planUpdate}\n### Phase 3 : Fiabilité & Mode Offline`);
fs.writeFileSync('plan.md', plan);

// 4. UPDATE NOS_IDEES.MD
let idees = fs.readFileSync('nos_idees.md', 'utf8');
idees = idees.replace('### Monétisation & Prix', `### Monétisation & Prix\n- [x] **Bouclier Anti-Usurpation SMS (S32) 🛡️ :** Rejet des faux SMS envoyés depuis des numéros réguliers (Spoofing).\n- [x] **Refonte UX Paiement Séquentiel (S32) :** Séparation Saisie Numéro et Transfert, avec ajout d'une note de courtoisie pour justifier les 10% (transparence).\n- [x] **Correctifs Regex Orange Money (S32) :** Support des points dans l'ID de transaction et de l'unité "Ar".`);
idees = idees.replace(/\*Dernière mise à jour : .*?\*/g, `*Dernière mise à jour : ${date} - Session 32 : UX Mobile Money, Anti-Fraude SMS.*`);
fs.writeFileSync('nos_idees.md', idees);

console.log("Documents mis à jour avec succès.");
