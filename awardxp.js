/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

const PARTY_FOLDER_NAME = "The Party";
const DEFAULT_XP_AWARD = 1;

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/**
 * Open dialog at when the preDeleteCombat hook is fired.
 * TODO: Add back in to implement "Hunter mode"
 */
// Hooks.on('preDeleteCombat', (combat, html, id) => {
//   if (!game.user.isGM) return
//   const pcs = combat.combatants.filter(c => c.actor.type === 'character' && c.actor.alliance === 'party' && !c.actor.traits.has('eidolon') && !c.actor.traits.has('minion')).map(c => c.actor)
//   const pwol = game.shadowdark.settings.variants.pwol.enabled;
//   let calulatedXP = game.shadowdark.gm.calculateXP(
//     pcs[0].system.details.level.value,
//     pcs.length,
//     combat.combatants.filter(c => c.actor.alliance === 'opposition').map(c => c.actor.system.details.level.value),
//     combat.combatants.filter(c => c.actor.type === "hazard").map(c => c.actor.system.details.level.value),
//     { pwol }
//   )
//   const award = new game.shadowdark_awardxp.Award(null, { destinations: pcs, description: 'Treasure (' + calulatedXP.rating.charAt(0).toUpperCase() + calulatedXP.rating.slice(1) + ')', xp: calulatedXP.xpPerPlayer });
//   award.render(true);
// })


Hooks.once("init", async () => {
  console.log('Shadowdark Award XP Init')
  game.shadowdark_awardxp = {
    openDialog: Award.openDialog,
    openPlayerDialog: Award.openDialog,
    Award: Award
  }
  registerCustomEnrichers();
  registerWorldSettings();

});


Hooks.once("ready", async () => {
  game.shadowdark_awardxp.Award._welcomeMessage();
});


Hooks.on("chatMessage", (app, message, data) => game.shadowdark_awardxp.Award.chatMessage(message));

export function registerCustomEnrichers() {
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/(?<type>award) (?<config>[^\]]+)]](?:{(?<label>[^}]+)})?/gi,
    enricher: enrichAward
  })

  document.body.addEventListener("click", awardAction);
}

export function registerWorldSettings() {
  game.settings.register("shadowdark-award-xp", "welcomeMessageShown", {
    scope: "world",
    name: "welcomeMessageShown",
    hint: "welcomeMessageShown",
    config: false,
    type: Boolean,
    default: false
  });
}


/* -------------------------------------------- */
/*  Enrichers                                   */
/* -------------------------------------------- */

/**
 * Enrich an award block displaying amounts for each part granted with a GM-control for awarding to the party.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link if the check could be built, otherwise null.
 */
function parseConfig(match) {
  const config = { _config: match, values: [] };
  for (const part of match.match(/(?:[^\s"]+|"[^"]*")+/g)) {
    if (!part) continue;
    const [key, value] = part.split("=");
    const valueLower = value?.toLowerCase();
    if (value === undefined) config.values.push(key.replace(/(^"|"$)/g, ""));
    else if (["true", "false"].includes(valueLower)) config[key] = valueLower === "true";
    else if (Number.isNumeric(value)) config[key] = Number(value);
    else config[key] = value.replace(/(^"|"$)/g, "");
  }
  return config;
}


async function enrichAward(match, options) {
  let { type, config, label } = match.groups;
  config = parseConfig(config);
  config._input = match[0];
  const command = config._config;

  const block = document.createElement("span");
  block.classList.add("award-block", "shadowdarkaxp");
  block.dataset.awardCommand = command;

  block.innerHTML += `<a class="award-link" data-action="awardRequest">
     <i class="fa-solid fa-trophy"></i> ${label ?? game.i18n.localize("ShadowdarkAXP.Award.Action")}
   </a>
 `;

  return block;
}


/* -------------------------------------------- */
/*  Actions                                     */
/* -------------------------------------------- */

/**
 * Forward clicks on award requests to the Award application.
 * @param {Event} event  The click event triggering the action.
 * @returns {Promise|void}
 */
async function awardAction(event) {
  const target = event.target.closest('[data-action="awardRequest"]');
  const command = target?.closest("[data-award-command]")?.dataset.awardCommand;
  if (!command) return;
  event.stopPropagation();
  Award.handleAward(command);
}

function getParty() {
  const partyFolders = game.folders.filter(f => f.name === PARTY_FOLDER_NAME);
  if (partyFolders.length > 0) {
    return partyFolders[0].contents.filter(u => u.type === "Player");
  }
  return [];
}

class Award extends FormApplication {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shadowdark", "award", "dialog", "shadowdarkawardxp"],
      template: "modules/shadowdark-award-xp/templates/apps/award.hbs",
      title: "ShadowdarkAXP.Award.Title",
      width: 425,
      height: "auto",
      currency: null,
      xp: null,
      type: null,
      description: null,
      destinations: [],
    });
  }

  getData(options = {}) {
    const context = super.getData(options);
    context.xp = this.options.xp ?? 0;
    context.description = this.options.description ?? null;
    context.destinations = this.options.destinations.length > 0 ? this.options.destinations : getParty();
    return context;
  }

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    this.form.querySelector('button[name="transfer"]').disabled = true;

    if (data['award-type'] != "Custom") { data.description = data['award-type']; }
    const destinations = []
    for (const actor in data.destination) {
      if (data.destination[actor] == true) destinations.push(game.actors.get(actor))
    }
    this.close();
    if (game.user.isGM) {
      await this.constructor.awardXP(data.xp, destinations)
      await this.constructor.displayAwardMessages(data.xp, data.description, destinations);
    }
  }

  /**
  * Update the actors with the current EXP value.
  * @param {integer} amount  value of EXP to grant.
  * @param {array[actors]} destinations  text description to be displayed in chatMessage.
  */
  static async awardXP(amount, destinations) {
    if (!amount || !destinations.length) return;
    for (const destination of destinations) {
      try {
        console.log(`Shadowdark Award XP - ${destination.name} - ${destination.system.level.xp}(starting) +  ${amount} (award) = ${destination.system.level.xp + amount} (total)`)
        await destination.update({ 'system.level.xp': destination.system.level.xp + amount })
      } catch (err) {
        ui.notifications.warn(destination.name + ": " + err.message);
      }
    }
  }

  /**
  * Send the ChatMessage from the template file.
  * @param {integer} amount  value of EXP to grant.
  * @param {string} description  text description to be displayed in chatMessage.
  * @param {array[actors]} destinations  text description to be displayed in chatMessage.
  */
  static async displayAwardMessages(amount, description, destinations) {
    const context = {
      message: game.i18n.format("ShadowdarkAXP.Award.Message",
        { award: amount, description: description }),
      destinations: destinations
    }
    const content = await renderTemplate("modules/shadowdark-award-xp/templates/chat/party.hbs", context);

    const messageData = {
      type: CONST.CHAT_MESSAGE_STYLES["OTHER"],
      content: content,
      speaker: ChatMessage.getSpeaker({ actor: this.parent }),
      rolls: null,

    }
    return ChatMessage.create(messageData, {});
  }

  /* -------------------------------------------- */
  /*  Event Handling                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    this._validateForm();

    html.find('[name=award-type]').on("change", function () {
      html.find('[name=xp]')[0].value = this.selectedOptions[0].getAttribute("data-xp");
      if (this.selectedOptions[0].value == "Custom") {
        $(".shadowdark_awardxp_description").css("visibility", "visible");
      } else {
        $(".shadowdark_awardxp_description").css("visibility", "hidden");
      }
    });
  }


  /** @inheritDoc */
  _onChangeInput(event) {
    super._onChangeInput(event);
    this._validateForm();
  }

  _validateForm() {
    const data = foundry.utils.expandObject(this._getSubmitData());
    let valid = true;
    this.form.querySelector('button[name="transfer"]').disabled = !valid;
  }


  /* -------------------------------------------- */
  /*  Chat Command                                */
  /* -------------------------------------------- */

  /**
   * Regular expression used to match the /award command in chat messages.
   * @type {RegExp}
   */
  static COMMAND_PATTERN = new RegExp(/^\/award(?:\s|$)/i);


  /**
   * Regular expression used to split currency & xp values from their labels.
   * @type {RegExp}
   */
  //static VALUE_PATTERN = new RegExp(/^(.+?)(\D+)$/);
  static VALUE_PATTERN = new RegExp(/^(\d+)(.*)/);


  /**
   * Use the `chatMessage` hook to determine if an award command was typed.
   * @param {string} message   Text of the message being posted.
   * @returns {boolean|void}   Returns `false` to prevent the message from continuing to parse.
   */
  static chatMessage(message) {
    if (!this.COMMAND_PATTERN.test(message)) return;
    this.handleAward(message);
    return false;
  }


  /**
   * Parse the award command and grant an award.
   * @param {string} message  Award command typed in chat.
   */
  static async handleAward(message) {
    if (!game.user.isGM) {
      ui.notifications.error("ShadowdarkAXP.Award.NotGMError", { localize: true });
      return;
    }

    try {
      const { xp, description } = this.parseAwardCommand(message);
      const award = new game.shadowdark_awardxp.Award(null, { xp: parseInt(xp ?? DEFAULT_XP_AWARD), description: description });
      award.render(true);

    } catch (err) {
      ui.notifications.warn(err.message);
    }
  }

  /**
   * Parse the award command and grant an award.
   * @param {string} message  Award command typed in chat.
   */
  static parseAwardCommand(message) {
    const command = message.replace(this.COMMAND_PATTERN, "");
    let [full, xp, description] = command.match(this.VALUE_PATTERN) ?? [];
    return { xp, description };
  }

  /**
   * Use the `openDialog` method is a shim to removed in a furture update.
   */
  static openDialog(options = {}) {
    if (!game.user.isGM) {
      ui.notifications.error("ShadowdarkAXP.Award.NotGMError", { localize: true });
      return;
    }

    let xp = options.award ?? null;
    let description = options.description ?? null;
    const award = new game.shadowdark_awardxp.Award(null, { xp: xp, description: description });
    award.render(true);

  }


  static _welcomeMessage() {
    if (!game.settings.get("shadowdark-award-xp", "welcomeMessageShown")) {
      if (game.user.isGM) {
        const content = [`
            <div class="shadowdarkawardxp">
                <h3 class="nue">${game.i18n.localize("ShadowdarkAXP.Welcome.Title")}</h3>
                <p class="nue">${game.i18n.localize("ShadowdarkAXP.Welcome.WelcomeMessage1")}</p>
                <p class="nue">${game.i18n.localize("ShadowdarkAXP.Welcome.WelcomeMessage2")}</p>
                <p>
                    ${game.i18n.localize("ShadowdarkAXP.Welcome.WelcomeEnricherJank")}
                </p>
                <p class="nue">${game.i18n.localize("ShadowdarkAXP.Welcome.WelcomeMessageOutput")}</p>
                <p>
                    ${game.i18n.localize("ShadowdarkAXP.Welcome.WelcomeEnricher")}
                </p>
                <p class="nue">${game.i18n.localize("ShadowdarkAXP.Welcome.WelcomeMessage3")}</p>
                <p>
                    ${game.i18n.localize("ShadowdarkAXP.Welcome.WelcomeCommand")}
                </p>
                <p class="nue"></p>
                <footer class="nue"></footer>
            </div>
            `];
        const chatData = content.map(c => {
          return {
            whisper: [game.user.id],
            speaker: { alias: "Shadowdark Award Exp" },
            flags: { core: { canPopout: true } },
            content: c
          };
        });
        ChatMessage.implementation.createDocuments(chatData);
        //Set flag to not send message again
        game.settings.set("shadowdark-award-xp", "welcomeMessageShown", true)
      }
    }
  }
}
