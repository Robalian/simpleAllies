export const allies = [
    'Player1',
    'Player2',
    'Player3',
]
// This is the conventional segment used for team communication
export const allySegmentID = 90
// This isn't in the docs for some reason, so we need to add it
export const maxSegmentsOpen = 10

export type AllyRequestTypes =     'resource' |
'defense' |
'attack' |
'player' |
'work' |
'econ' |
'room'

export interface ResourceRequest {
    priority: number
    roomName: string
    resourceType: ResourceConstant
    /**
     * How much they want of the resource. If the responder sends only a portion of what you ask for, that's fine
     */
    amount: number
    /**
     * If the bot has no terminal, allies should instead haul the resources to us
     */
    terminal?: boolean
}

export interface DefenseRequest {
    roomName: string
    priority: number
}

export interface AttackRequest {
    roomName: string
    priority: number
}

export interface PlayerRequest {
    playerName: string
    /**
     * The amount you think your team should hate the player. Hate should probably affect combat aggression and targetting
     */
    hate?: number
    /**
     * The last time this player has attacked you
     */
    lastAttackedBy?: number
}

export type WorkRequestType = 'build' | 'upgrade' | 'repair'

export interface WorkRequest {
    roomName: string
    priority: number
    workType: WorkRequestType
}

export interface EconRequest {
    /**
     * total credits the bot has. Should be 0 if there is no market on the server
     */
    credits: number
    /**
     * the maximum amount of energy the bot is willing to share with allies. Should never be more than the amount of energy the bot has in storing structures
     */
    sharableEnergy: number
    /**
     * The average energy income the bot has calculated over the last 100 ticks
     * Optional, as some bots might not be able to calculate this easily.
     */
    energyIncome?: number
    /**
     * The number of mineral nodes the bot has access to, probably used to inform expansion
     */
    mineralNodes?: { [key in MineralConstant]: number }
}

export interface RoomRequest {
    roomName: string
    /**
     * The player who owns this room. If there is no owner, the room probably isn't worth making a request about
     */
    playerName: string
    /**
     * The last tick your scouted this room to acquire the data you are now sharing
     */
    lastScout: number
    rcl: number
    /**
     * The amount of stored energy the room has. storage + terminal + factory should be sufficient
     */
    energy: number
    towers: number
    avgRamprtHits: number
    terminal: boolean
}

export interface AllyRequests {
    resource: ResourceRequest[]
    defense: DefenseRequest[]
    attack: AttackRequest[]
    player: PlayerRequest[]
    work: WorkRequest[]
    econ: EconRequest
    room: RoomRequest[]
}
/**
 * Having data we pass into the segment being an object allows us to send additional information outside of requests
 */
export interface SegmentData {
    /**
     * Requests of the new system
     */
    requests: AllyRequests
}

class SimpleAllies {
    /**
     * The intra-tick index for tracking IDs assigned to requests
     */
    private requestID: number
    myRequests: Partial<AllyRequests> = {}
    allySegmentData: SegmentData
    currentAlly: string

    /**
     * To call before any requests are made or responded to. Configures some required values and gets ally requests
     */
    initRun() {
        // Reset the data of myRequests
        this.myRequests = {
            resource: [],
            defense: [],
            attack: [],
            player: [],
            work: [],
            room: [],
        }
        this.requestID = 0

        this.readAllySegment()
    }

    /**
     * Try to get segment data from our current ally. If successful, assign to the instane
     */
    readAllySegment() {
        if (!allies.length) {
            throw Error("Failed to find an ally for simpleAllies, you probably have none :(")
        }

        this.currentAlly = allies[Game.time % allies.length]

        // Make a request to read the data of the next ally in the list, for next tick
        const nextAllyName = allies[(Game.time + 1) % allies.length]
        RawMemory.setActiveForeignSegment(nextAllyName, allySegmentID)

        // Maybe the code didn't run last tick, so we didn't set a new read segment
        if (!RawMemory.foreignSegment) return
        if (RawMemory.foreignSegment.username !== this.currentAlly) return

        // Protect from errors as we try to get ally segment data
        try {
            this.allySegmentData = JSON.parse(RawMemory.foreignSegment.data)
        } catch (err) {
            console.log('Error in getting requests for simpleAllies', this.currentAlly)
        }
    }

    /**
     * To call after requests have been made, to assign requests to the next ally
     */
    endRun() {

        // Make sure we don't have too many segments open
        if (Object.keys(RawMemory.segments).length >= maxSegmentsOpen) {
            throw Error('Too many segments open: simpleAllies')
        }

        const newSegmentData: SegmentData = {
            requests: this.myRequests as AllyRequests
        }

        RawMemory.segments[allySegmentID] = JSON.stringify(newSegmentData)
        RawMemory.setPublicSegments([allySegmentID])
    }

    // Request methods

    requestResource(args: ResourceRequest) {

        this.myRequests.resource.push(args)
    }

    requestDefense(
        args: DefenseRequest
    ) {

        this.myRequests.defense.push(args)
    }

    requestAttack(
        args: AttackRequest
    ) {

        this.myRequests.attack.push(args)
    }

    requestPlayer(args: PlayerRequest) {

        this.myRequests.player.push(args)
    }

    requestWork(args: WorkRequest) {

        this.myRequests.work.push(args)
    }

    requestEcon(args: EconRequest) {

        this.myRequests.econ = args
    }

    requestRoom(args: RoomRequest) {

        this.myRequests.room.push(args)
    }

    private newRequestID() {

        return (this.requestID += 1).toString()
    }
}

export const simpleAllies = new SimpleAllies()