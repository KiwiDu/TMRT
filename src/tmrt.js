import { body_parts } from './formulae.js'
let Tmrt = {}

const rot_helper = (str, rot = 0) => {
    //cases where it is not compeletely symmetrical
    //treat as asymmetrical at first
    let rankStr = 'flbr'
    let splited = str.split('_')
    let rotated = splited.map(s => {
        if (s.length > 1) return s
        let rank = (rankStr.indexOf(s) + rot) % 4
        rank = rank < 0 ? rank + 4 : rank
        return rankStr.charAt(rank)
    })
    //swap to match naming conventions for floor and ceiling
    //first l/f, then f/b
    if ((rotated[0].length > 1) && ('fb'.includes(rotated[1]))) {
        let tmp = rotated[1]
        rotated[1] = rotated[2]
        rotated[2] = tmp
    }
    return rotated.join('_')
}

function calc_surfaces_dim(room_dim, human_dim) {
    let x = human_dim.x//left = x+
    let y = human_dim.y//front= y+
    let half_w = room_dim.w / 2
    let half_l = room_dim.l / 2
    let H = room_dim.h
    let center_h = human_dim.h / 2

    return {
        ceil_l_b: { a: half_w - x, b: half_l + y, c: H - center_h },
        ceil_l_f: { a: half_w - x, b: half_l - y, c: H - center_h },
        ceil_r_b: { a: half_w + x, b: half_l + y, c: H - center_h },
        ceil_r_f: { a: half_w + x, b: half_l - y, c: H - center_h },

        floor_l_b: { a: half_w - x, b: half_l + y, c: center_h },
        floor_l_f: { a: half_w - x, b: half_l - y, c: center_h },
        floor_r_b: { a: half_w + x, b: half_l + y, c: center_h },
        floor_r_f: { a: half_w + x, b: half_l - y, c: center_h },

        f_wall_l: { a: half_w - x, b: H, c: half_l - y },
        f_wall_r: { a: half_w + x, b: H, c: half_l - y },
        b_wall_l: { a: half_w - x, b: H, c: half_l + y },
        b_wall_r: { a: half_w + x, b: H, c: half_l + y },

        l_wall_b: { a: half_l + y, b: H, c: half_w - x },
        l_wall_f: { a: half_l - y, b: H, c: half_w - x },
        r_wall_b: { a: half_l + y, b: H, c: half_w + x },
        r_wall_f: { a: half_l - y, b: H, c: half_w + x },
    }
}

function calc_vfs(surface_dim, rot = 0) {
    let results = {}
    //subdiv = sub-division, dims = dimensions, part = body part, emp = empirical formula
    let vf_sum_helper = function (subdiv_dims, part, info, rot) {
        let vfsum = {}
        //mapping: one part vs. multiple sub-divisions
        for (const [emp_name, subdivs] of Object.entries(info)) {
            for (const surface_map of subdivs) {
                let surface = surface_map.shift()
                for (const v of surface_map) {
                    let subdiv_name = rot_helper(`${surface}_${v}`, rot)
                    let surface_name = rot_helper(surface, rot)
                    if (!(surface_name in vfsum)) {
                        vfsum[surface_name] = 0
                    }

                    let subdiv = subdiv_dims[subdiv_name]
                    let emp = part[emp_name]

                    vfsum[surface_name] += vf_emp_formula(subdiv, emp)
                }
            }
        }
        return vfsum
    }

    for (let part_name in body_parts) {
        let vfs = {}
        let part = body_parts[part_name]
        switch (part.sym) {
            case 3://symmetrical in all directions
                vfs = vf_sum_helper(surface_dim, part, {
                    ceil_l_f: [['ceil', 'l_f', 'l_b', 'r_f', 'r_b']],
                    floor_l_f: [['floor', 'l_f', 'l_b', 'r_f', 'r_b']],
                    l_wall_f: [['l_wall', 'f', 'b'],
                    ['r_wall', 'f', 'b'],
                    ['f_wall', 'l', 'r'],
                    ['b_wall', 'l', 'r']]
                }, rot)
                break
            case 2://symmetrical in front and back
                vfs = vf_sum_helper(surface_dim, part, {
                    ceil_l_f: [['ceil', 'l_f', 'l_b']],
                    ceil_r_f: [['ceil', 'r_f', 'r_b']],

                    floor_l_f: [['floor', 'l_f', 'l_b']],
                    floor_r_f: [['floor', 'r_f', 'r_b']],

                    f_wall_l: [['f_wall', 'l']],
                    f_wall_r: [['f_wall', 'r']],
                    b_wall_l: [['b_wall', 'l']],
                    b_wall_r: [['b_wall', 'r']],
                    l_wall_f: [['l_wall', 'f', 'b']],
                    r_wall_f: [['r_wall', 'f', 'b']]
                }, rot)
                break
            case 1://symmetrical in left and right
                vfs = vf_sum_helper(surface_dim, part, {
                    ceil_l_f: [['ceil', 'l_f', 'r_f']],
                    ceil_l_b: [['ceil', 'l_b', 'r_b']],

                    floor_l_f: [['floor', 'l_f', 'r_f']],
                    floor_l_b: [['floor', 'l_b', 'r_b']],

                    f_wall_l: [['f_wall', 'l', 'r']],
                    b_wall_l: [['b_wall', 'l', 'r']],
                    l_wall_f: [['l_wall', 'f'], ['r_wall', 'f']],
                    l_wall_b: [['l_wall', 'b'], ['r_wall', 'b']],
                }, rot)
                break
            case 0://asymmetrical
                vfs = vf_sum_helper(surface_dim, part, {
                    ceil_l_f: [['ceil', 'l_f']],
                    ceil_r_f: [['ceil', 'r_f']],
                    ceil_l_b: [['ceil', 'l_b']],
                    ceil_r_b: [['ceil', 'r_b']],
                    floor_l_f: [['floor', 'l_f']],
                    floor_r_f: [['floor', 'r_f']],
                    floor_l_b: [['floor', 'l_b']],
                    floor_r_b: [['floor', 'r_b']],
                    f_wall_l: [['f_wall', 'l']],
                    f_wall_r: [['f_wall', 'r']],
                    b_wall_l: [['b_wall', 'l']],
                    b_wall_r: [['b_wall', 'r']],
                    l_wall_f: [['l_wall', 'f']],
                    l_wall_b: [['l_wall', 'b']],
                    r_wall_f: [['r_wall', 'f']],
                    r_wall_b: [['r_wall', 'b']],
                }, rot)
                break
        }
        results[part_name] = vfs
    }
    return results
}

function calc_mrt(surfaces, vfs) {
    let results = {}
    for (let part_name in vfs) {
        let vf = vfs[part_name]
        let rT4 = 0
        let total_weight = 0
        for (let k in surfaces) {
            let weight = surfaces[k].e * vf[k]
            total_weight += weight
            let Twall = surfaces[k].t + 273.14
            rT4 += weight * Math.pow(Twall, 4)
        }
        let mrT = Math.pow(rT4 / total_weight, 0.25)
        let mrt = mrT - 273.14
        results[part_name] = Math.round(100 * mrt) / 100
    }
    return results
}

function vf_emp_formula(dim, arg) {
    if (dim.c < 0) return NaN
    let a2c = dim.a / dim.c
    let b2c = dim.b / dim.c
    return arg.m * (Math.exp(-arg.n * a2c) + arg.p) * (Math.exp(-arg.q * b2c) + arg.t) + arg.w
}

Tmrt.calc = (room_dim, room_args, human_dim) => {
    let surface_dim = calc_surfaces_dim(room_dim, human_dim)
    let vfs = calc_vfs(surface_dim, human_dim.rot)
    let mrt = calc_mrt(room_args, vfs)
    return [mrt, vfs]
}

export { Tmrt };