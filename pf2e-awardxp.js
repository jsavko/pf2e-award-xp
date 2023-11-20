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
    game.pf2e_awardxp.openDialog({actors: pcs, award: calulatedXP.xpPerPlayer, description: 'Encounter (' + calulatedXP.rating.charAt(0).toUpperCase() +  calulatedXP.rating.slice(1) + ')' })
})


Hooks.once("init", async () => {
    console.log('PF2E Award XP Init')
    game.pf2e_awardxp = {openDialog: pf2e_awardxp_dialog}
});


  /**
   * Open dialog and award exp to Actors. May pass an object: 
   * @param {object | null} [options] Additional specific data keys/values which override the defaults
   *                                  actor: array of actors | defaults to the pf2 party
   *                                  award: XP value to award as INT | defaults 1
   *                                  description: Text description to display in award message | Defaults "Custom" 
   */

function pf2e_awardxp_dialog(options={}){
    let selected;
    
    if (options.award == undefined) { options.award = '';}
    if (!!options.description) {
        selected = `<option selected value="${options.description}" data-xp="${options.award}"> ${options.description} ${options.award} exp</option>`;
    }
    
    if (!options.actors) {
        options.actors = game.actors.party.members;
    }

    new Dialog({
        title: "Award Party XP",
        content: `
            <p><b>Recipients</b>: ${options.actors.map(a => a.name ).join(', ')}<br/><br/></p>
            <b>Select encounter difficulty or enter custom amount.</b>
            <form>
            <div class="form-group">
            <label>Award for</label>
            <select id="award-type" style="width: 245px !important;">
                <option value="Custom">Custom</option>
                ${selected}
                <option value="Encounter (Trivial)" data-xp="40">Encounter (Trivial) 40 exp</option>
                <option value="Encounter (Low)" data-xp="60">Encounter (Low) 60 exp</option>
                <option value="Encounter (Moderate)" data-xp="80">Encounter (Moderate) 80 exp</option>
                <option value="Encounter (Severe)" data-xp="120">Encounter (Severe) 120 exp</option>
                <option value="Encounter (Extreme)" data-xp="160" >Encounter (Extreme) 160 exp</option>
                <option value="Accomplishment (Minor)" data-xp="10">Accomplishment (Minor) 10 exp</option>
                <option value="Accomplishment (Moderate)" data-xp="30">Accomplishment (Moderate) 30 exp</option>
                <option value="Accomplishment (Major)" data-xp="80">Accomplishment (Major) 80 exp</option>
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
                    options.actors.forEach(async a => await a.update({'system.details.xp.value': xp_gain+a.system.details.xp.value}))
                    ChatMessage.create({content: `<strong>The Party gained ${xp_gain} XP for ${type}.</strong><br/>Recipients: ${options.actors.map(a => a.name).join(', ')}<br/>`})
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





