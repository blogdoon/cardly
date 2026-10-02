/**
 * Front-cover text policy.
 *
 * A template's front (first side) is artwork only. Any wording baked into a
 * template — a headline like "Happy 30th" or a subtext line — is design preview
 * text that the customer did not choose, and it fights whatever they type. So
 * the front is stripped of text elements before it reaches the editor, and
 * templates are generated without them in the first place.
 *
 * Only the FRONT is affected. The inside-right message and the back brandmark
 * are intentional: the first is where the customer's message goes, the second
 * is the studio's own mark.
 *
 * This is enforced at load time rather than by migrating the database, so cards
 * already stored in Postgres are cleaned up too.
 */

import type { CardElement, CardPageDefinition, CardTemplate } from '../types/template';
import type { UserDesign } from '../types/design';

const isTextElement = (el: CardElement): boolean => el.type === 'text';

/**
 * A copy of the page with every text element removed.
 * Non-text elements (photos, stickers, shapes) and the page background are
 * left exactly as they are.
 */
export function stripFrontText(page: CardPageDefinition): CardPageDefinition {
  return {
    ...page,
    elements: page.elements.filter((el) => !isTextElement(el)),
  };
}

/** True when the front page still carries text (used by tests and admin tooling). */
export function frontHasText(template: CardTemplate): boolean {
  return template.defaultPages.front.elements.some(isTextElement);
}

/**
 * A copy of the template whose front page carries no text.
 * Cheap, shallow-per-page copy — safe to call on a live template.
 */
export function withBlankFront(template: CardTemplate): CardTemplate {
  return {
    ...template,
    defaultPages: {
      ...template.defaultPages,
      front: stripFrontText(template.defaultPages.front),
    },
  };
}

/**
 * The default pages a customer starts editing from: the template's pages with a
 * blank front. Use this anywhere a template is turned into an editable design.
 */
export function editablePagesFrom(template: CardTemplate) {
  const { front, insideLeft, insideRight, back } = template.defaultPages;
  return {
    front: stripFrontText(front),
    insideLeft: insideLeft
      ? JSON.parse(JSON.stringify(insideLeft))
      : { pageType: 'inside-left' as const, backgroundColor: '#ffffff', elements: [] },
    insideRight: JSON.parse(JSON.stringify(insideRight)),
    back: JSON.parse(JSON.stringify(back)),
  };
}

/**
 * A `UserDesign` for a card bought without being personalised — the quick-add on
 * the card detail page.
 *
 * WHY THIS EXISTS. Fulfilment renders the `designSnapshot` stored ON THE ORDER ITEM
 * (`create-checkout` copies it into `items`), never the live design row, so that the
 * card that arrives is the one that was bought even if the template is edited or
 * retired afterwards. Anything that adds a card to the cart WITHOUT a snapshot
 * therefore buys something that cannot be printed: `Account.getOrderCardDesign`
 * quietly falls back to the template's defaults, which is a blank card with no
 * message on it. The card detail quick-add did exactly that.
 *
 * It runs the pages through `editablePagesFrom`, not `defaultPages` directly, so the
 * artwork-only front rule holds here too — a template stored before that rule would
 * otherwise print its preview headline onto the front of a customer's card.
 *
 * Deep-copied for the same reason as everywhere else in this file: `items` is
 * persisted into an order, and a live reference into the catalog would let a later
 * catalog edit mutate a placed order's design.
 */
export function designSnapshotFromTemplate(template: CardTemplate): UserDesign {
  const pages = editablePagesFrom(template);
  return {
    id: `snapshot_${template.id}`,
    templateId: template.id,
    // The guest id the design table uses for unsigned-in authors; this design is
    // never saved, it only travels with the cart line.
    userId: 'guest_user',
    title: template.title,
    pages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
