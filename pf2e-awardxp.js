/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/**
 * Open dialog at when the preDeleteCombat hook is fired.
 */
Hooks.on('preDeleteCombat', (combat,html,id) => {
    if (!game.user.isGM) return
    const pcs = combat.combatants.filter(c => c.actor.type==='character').map(c => c.actor)
    let calulatedXP = game.pf2e.gm.calculateXP(
        pcs[0].system.details.level.value,
        pcs.length,
        combat.combatants.filter(c => c.actor.type === 'npc').map(c => c.actor.system.details.level.value),
        combat.combatants.filter(c => c.actor.type === "hazard").map(c => c.actor.system.details.level.value),
        {}
    )
    const award = new game.pf2e_awardxp.Award(null,{destinations:pcs, description:'Encounter (' + calulatedXP.rating.charAt(0).toUpperCase() +  calulatedXP.rating.slice(1) + ')', xp:calulatedXP.xpPerPlayer});
    award.render(true);
})


Hooks.once("init", async () => {
    console.log('PF2E Award XP Init')
    game.pf2e_awardxp = {openDialog: Award.openDialog,
                        openPlayerDialog: Award.openDialog,
                        openKingdomDialog: pf2e_awardxp_dialog_kingdom,
                        Award: Award
                        }
    registerCustomEnrichers()
});

Hooks.on("chatMessage", (app, message, data) => game.pf2e_awardxp.Award.chatMessage(message));


export function registerCustomEnrichers() {
CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/(?<type>award) (?<config>[^\]]+)]](?:{(?<label>[^}]+)})?/gi,
    enricher: enrichAward
})

//document.body.addEventListener("click", awardAction);
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
    for ( const part of match.match(/(?:[^\s"]+|"[^"]*")+/g) ) {
      if ( !part ) continue;
      const [key, value] = part.split("=");
      const valueLower = value?.toLowerCase();
      if ( value === undefined ) config.values.push(key.replace(/(^"|"$)/g, ""));
      else if ( ["true", "false"].includes(valueLower) ) config[key] = valueLower === "true";
      else if ( Number.isNumeric(value) ) config[key] = Number(value);
      else config[key] = value.replace(/(^"|"$)/g, "");
    }
    return config;
  }


async function enrichAward(match, options) {
    console.log('enrich')
    let { type, config, label } = match.groups;
    config = parseConfig(config);
    config._input = match[0];
   console.log(type)
   console.log(config)
   console.log(label)
    return null;
  }

  async function enrichAwards(config, label, options) {
    const command = config._config;
    let parsed;
    try {
      parsed = Award.parseAwardCommand(command);
    } catch(err) {
      console.warn(err.message);
      return null;
    }
  
    const block = document.createElement("span");
    block.classList.add("award-block", "dnd5e2");
    block.dataset.awardCommand = command;
  
    const entries = [];
    for ( let [key, amount] of Object.entries(parsed.currency) ) {
      const label = CONFIG.DND5E.currencies[key].label;
      amount = Number.isNumeric(amount) ? formatNumber(amount) : amount;
      entries.push(`
        <span class="award-entry">
          ${amount} <i class="currency ${key}" data-tooltip="${label}" aria-label="${label}"></i>
        </span>
      `);
    }
    if ( parsed.xp ) entries.push(`
      <span class="award-entry">
        ${formatNumber(parsed.xp)} ${game.i18n.localize("DND5E.ExperiencePointsAbbr")}
      </span>
    `);
  
    let award = game.i18n.getListFormatter({ type: "unit" }).format(entries);
    if ( parsed.each ) award = game.i18n.format("EDITOR.DND5E.Inline.AwardEach", { award });
  
    block.innerHTML += `
      ${award}
      <a class="award-link" data-action="awardRequest">
        <i class="fa-solid fa-trophy"></i> ${label ?? game.i18n.localize("DND5E.Award.Action")}
      </a>
    `;
  
    return block;
  }
  
  
  /* -------------------------------------------- */


/* -------------------------------------------- */
/*  Actions                                     */
/* -------------------------------------------- */

/**
 * Forward clicks on award requests to the Award application.
 * @param {Event} event  The click event triggering the action.
 * @returns {Promise|void}

async function awardAction(event) {
    const target = event.target.closest('[data-action="awardRequest"]');
    const command = target?.closest("[data-award-command]")?.dataset.awardCommand;
    if ( !command ) return;
    event.stopPropagation();
    Award.handleAward(command);
  }
  
 */

function pf2e_awardxp_dialog_kingdom(options = {}) {
    if (!game.actors.party.campaign.active) {
        ui.notifications.error("You can not award Kingdom Experience before the kingdom is founded.");
        return
    }

    let selected;
    
    if (options.award == undefined) { options.award = '';}
    if (!!options.description) {
        selected = `<option selected value="${options.description}" data-xp="${options.award}"> ${options.description} ${options.award} exp</option>`;
    }

    new Dialog({
        title: "Award Kingdom XP",
        content: `
            <b>Select milestone or enter custom amount.</b>
            <form>
            <div class="form-group">
            <label>Award for</label>
            <select id="award-type" style="width: 245px !important;">
                <option value="Custom">Custom</option>
                ${selected}
                <option data-xp="10">Activity: Claim a hex</option>
                <option data-xp="30">Activity: Kingdom Event</option>
                <option data-xp="1">Surplus RP XP Award</option>
                <option data-xp="40">Milestone: Claim your first Landmark</option>
                <option data-xp="40">Milestone: Claim your first Refuge</option>
                <option data-xp="40">Milestone: Establish your first village</option>
                <option data-xp="40" >Milestone: Reach kingdom Size 10</option>
                <option data-xp="60">Milestone: Establish diplomatic relationsp</option>
                <option data-xp="60">Milestone: Expand a village into your first town</option>
                <option data-xp="60">Milestone: All eight leadership roles are assigned</option>
                <option data-xp="60">Milestone: Reach kingdom Size 25</option>
                <option data-xp="80">Milestone: Establish your first trade agreement</option>
                <option data-xp="80">Milestone: Expand a town into your first city</option>
                <option data-xp="80">Milestone: Reach kingdom Size 50</option>
                <option data-xp="80">Milestone: Spend 100 RP during a Kingdom turn</option>
                <option data-xp="120">Milestone: Expand a city into your first metropolis</option>
                <option data-xp="120">Milestone: Reach kingdom Size 100</option>
            </select>
            </div>
            <div class="form-group">
            <label>Award</label>
            <input type="text" style="width: 245px !important;" inputmode="numeric" pattern="\d*"  placeholder="1" id="custom-xp-amount" value="${options.award}">
            </div>
            <div class="pf2e_awardxp_description form-group">
            <label>Description</label>
            <input type="text" style="width: 245px !important;" inputmode="text" id="custom-description" placeholder="Custom Description" value="">
            </div>
            </form>
            `,
        buttons: {
            one: {
                icon: '<i class="fas fa-check"></i>',
                label: "Confirm",
                callback: async (html) => {
                    let type = html.find('[id=award-type]')[0].value;
                    let xp_gain = parseInt(html.find('[id=custom-xp-amount]')[0].value)|| 1;
                    if (type == "Custom") type = html.find('[id=custom-description]')[0].value || "Custom";
                    //options.actors.forEach(async a => await a.update({'system.details.xp.value': xp_gain+a.system.details.xp.value}))
                    await game.actors.party.campaign.update({'xp.value': xp_gain + game.actors.party.campaign.xp.value});
                    //ChatMessage.create({content: `<strong>The Kingdom of ${game.actors.party.campaign.name} gained ${xp_gain} XP for ${type}.</strong><br/>`})
                    ChatMessage.create({content: `
                    <div style="float:left; margin:10px 10px 10px 10px"> <img style="border:none" src="modules/pf2e-award-xp/assets/exp64.png" width="45"></div><div style="margin-top:15px"><strong>The Kingdom of ${game.actors.party.campaign.name} gained ${xp_gain} XP for ${type}.</strong><br/></div><br/>`
                    })
                
                }
            },
            two: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
            }
        },
        default: "Cancel",
        render: (html) =>  {
            if (html.find('[id=award-type] :selected').text() != "Custom"){
                $(".pf2e_awardxp_description").css("visibility", "hidden");
            }
            html.find('[id=award-type]').on( "change", function() {
                html.find('[id=custom-xp-amount]')[0].value = this.selectedOptions[0].getAttribute("data-xp");
                if (this.selectedOptions[0].value == "Custom"){
                    $(".pf2e_awardxp_description").css("visibility", "visible");
                } else { 
                    $(".pf2e_awardxp_description").css("visibility", "hidden");
                }
              } );
        },

    }).render(true);

}

class Award extends FormApplication {

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          classes: ["pf2e", "award", "dialog","pf2eawardxp"],
          template: "modules/pf2e-award-xp/templates/apps/award.hbs",
          title: "PF2EAXP.Award.Title",
          width: 400,
          height: "auto",
          currency: null,
          xp: null,
          type: null,
          description: null,
          destinations: [],
        });
      }

      getData(options={}) {
        const context = super.getData(options);
        context.xp = this.options.xp ?? 0;
        context.description = this.options.description ?? null;
        context.destinations = this.options.destinations.length > 0 ? this.options.destinations : game.actors.party.members;
        return context;
      }

    /** @inheritdoc */
    async _updateObject(event, formData) {
        const data = foundry.utils.expandObject(formData);
        if(data['award-type'] != "Custom") {data.description = data['award-type'];}
        const destinations = []
        for (const actor in data.destination){ 
            if (data.destination[actor] == true) destinations.push(game.actors.get(actor))
        }
        this.close();
        await this.constructor.awardXP(data.xp, destinations)
        this.constructor.displayAwardMessages(data.xp, data.description, destinations);
    }
    
    /**
    * Update the actors with the current EXP value.
    * @param {integer} amount  value of EXP to grant.
    * @param {array[actors]} destinations  text description to be displayed in chatMessage.
    */
    static async awardXP(amount, destinations){
        if ( !amount || !destinations.length ) return;
        for ( const destination of destinations ) {
            await destination.update({'system.details.xp.value': destination.system.details.xp.value + amount})
        }
    }

    /**
    * Parse the award command and grant an award.
    * @param {integer} amount  value of EXP to grant.
    * @param {string} description  text description to be displayed in chatMessage.
    * @param {array[actors]} destinations  text description to be displayed in chatMessage.
    */

    static async displayAwardMessages(amount, description, destinations) {
        const context = {
            xp: amount,
            description: description,
            destinations:destinations
        }
        const content = await renderTemplate("modules/pf2e-award-xp/templates/chat/party.hbs", context);
    
        const messageData = {
          type: CONST.CHAT_MESSAGE_TYPES["OTHER"],
          content: content,
          speaker: ChatMessage.getSpeaker({actor: this.parent}),
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
    
    html.find('[name=award-type]').on( "change", function() {
        html.find('[name=xp]')[0].value = this.selectedOptions[0].getAttribute("data-xp");
        if (this.selectedOptions[0].value == "Custom"){
            $(".pf2e_awardxp_description").css("visibility", "visible");
        } else { 
            $(".pf2e_awardxp_description").css("visibility", "hidden");
        }
      } );

  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeInput(event) {
    super._onChangeInput(event);
    this._validateForm();
  }

  _validateForm() {
    const data = foundry.utils.expandObject(this._getSubmitData());
    let valid = true;
    //if ( !filteredKeys(data.amount ?? {}).length && !data.xp ) valid = false;
    //if ( !filteredKeys(data.destination ?? {}).length ) valid = false;
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

  /* -------------------------------------------- */

  /**
   * Regular expression used to split currency & xp values from their labels.
   * @type {RegExp}
   */
  //static VALUE_PATTERN = new RegExp(/^(.+?)(\D+)$/);
  static VALUE_PATTERN = new RegExp(/^(\d+)(.*)/);

  /* -------------------------------------------- */

  /**
   * Use the `chatMessage` hook to determine if an award command was typed.
   * @param {string} message   Text of the message being posted.
   * @returns {boolean|void}   Returns `false` to prevent the message from continuing to parse.
   */
  static chatMessage(message) {
    if ( !this.COMMAND_PATTERN.test(message) ) return;
    this.handleAward(message);
    return false;
  }


    /**
   * Parse the award command and grant an award.
   * @param {string} message  Award command typed in chat.
   */
  static async handleAward(message) {
    if ( !game.user.isGM ) {
        ui.notifications.error("PF2EAXP.Award.NotGMError", { localize: true });
        return;
      }

      try {
        const { xp, description } = this.parseAwardCommand(message);
        const award = new game.pf2e_awardxp.Award(null,{xp:xp, description:description});
        award.render(true);

      } catch(err) {
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
  static openDialog(options={}) { 
    let xp = options.award ?? null;
    let description = options.description ?? null;
    const award = new game.pf2e_awardxp.Award(null,{xp:xp, description:description});
    award.render(true);

  }

}