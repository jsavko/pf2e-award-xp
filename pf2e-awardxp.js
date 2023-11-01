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
    console.log(calulatedXP)
    game.pf2e_awardxp.openDialog(pcs, calulatedXP.xpPerPlayer, 'Encounter (' + calulatedXP.rating.charAt(0).toUpperCase() +  calulatedXP.rating.slice(1) + ')' )
})


Hooks.once("init", async () => {
    console.log('Init Hook fired! ')
    game.pf2e_awardxp = {openDialog: pf2e_awardxp_dialog}
});


function pf2e_awardxp_dialog(pcs, award, desc) {
    let selected
    if (award == undefined) {award = ''}
    if (!!desc) {
        selected = `<option selected value="${desc}" data-xp="${award}"> ${desc} ${award} exp</option>`;
    }

    new Dialog({
        title: "Award Party XP",
        content: `
            <b>Select encounter difficulty or enter custom amount.</b>
            <form>
            <div class="form-group">
            <label>Award for</label>
            <select id="award-type">
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
            <input type="text" inputmode="numeric" pattern="\d*" id="custom-xp-amount" value="${award}">
            </div>
            </form>
            `,
        buttons: {
            one: {
                icon: '<i class="fas fa-check"></i>',
                label: "Confirm",
                callback: async (html) => {
                    let type = html.find('[id=award-type]')[0].value;
                    let xp_gain = parseInt(html.find('[id=custom-xp-amount]')[0].value);
                    pcs.forEach(async a => await a.update({'system.details.xp.value': xp_gain+a.system.details.xp.value}))
                    ChatMessage.create({content: `<strong>The Party gained ${xp_gain} XP for ${type}.</strong><br/>Recipients: ${pcs.map(a => a.name).join(', ')}<br/>`})
                }
            },
            two: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
            }
        },
        default: "Cancel",
        render: (html) =>  {
            html.find('[id=award-type]').on( "change", function() {
                html.find('[id=custom-xp-amount]')[0].value = this.selectedOptions[0].getAttribute("data-xp");
              } );
        },

    }).render(true);
    
}




