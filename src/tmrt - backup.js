import { body_parts } from './formulae.js'
let Tmrt = {}


const rot_helper = (str, rot = 0) => {
    //needs no rotation if compeletely symmetrical
    //if (sym == 3) return splited
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

function calc_vf(surface_dim) {
    let results = {}

    for (let part_name in body_parts) {
        let vfs = {}
        let part = body_parts[part_name]
        switch (part.sym) {
            case 3://symmetrical in all directions
                vfs.ceil = vf_sum_dims([surface_dim.ceil_l_f, surface_dim.ceil_l_b, surface_dim.ceil_r_f, surface_dim.ceil_r_b], part.ceil_l_f)
                vfs.floor = vf_sum_dims([surface_dim.floor_l_f, surface_dim.floor_l_b, surface_dim.floor_r_f, surface_dim.floor_r_b], part.floor_l_f)
                vfs.l_wall = vf_sum_dims([surface_dim.l_wall_f, surface_dim.l_wall_b], part.l_wall_f)
                vfs.r_wall = vf_sum_dims([surface_dim.r_wall_f, surface_dim.r_wall_b], part.l_wall_f)
                vfs.f_wall = vf_sum_dims([surface_dim.f_wall_l, surface_dim.f_wall_r], part.l_wall_f)
                vfs.b_wall = vf_sum_dims([surface_dim.b_wall_l, surface_dim.b_wall_r], part.l_wall_f)
                break
            case 2://symmetrical in front and back
                vfs.ceil =
                    vf_sum_dims([surface_dim.ceil_l_f, surface_dim.ceil_l_b], part.ceil_l_f)
                    + vf_sum_dims([surface_dim.ceil_r_f, surface_dim.ceil_r_b], part.ceil_r_f)

                vfs.floor =
                    vf_sum_dims([surface_dim.floor_l_f, surface_dim.floor_l_b], part.floor_l_f)
                    + vf_sum_dims([surface_dim.floor_r_f, surface_dim.floor_r_b], part.floor_r_f)

                vfs.l_wall = vf_sum_dims([surface_dim.l_wall_f, surface_dim.l_wall_b], part.l_wall_f)
                vfs.r_wall = vf_sum_dims([surface_dim.r_wall_f, surface_dim.r_wall_b], part.r_wall_f)

                vfs.f_wall = vf_sum(surface_dim, part, ["f_wall_l", "f_wall_r"])
                vfs.b_wall = vf_sum(surface_dim, part, ["b_wall_l", "b_wall_r"])
                break
            case 1://symmetrical in left and right
                vfs.ceil =
                    vf_sum_dims([surface_dim.ceil_l_b, surface_dim.ceil_r_b], part.ceil_l_b)
                    + vf_sum_dims([surface_dim.ceil_l_f, surface_dim.ceil_r_f], part.ceil_l_f)

                vfs.floor =
                    vf_sum_dims([surface_dim.floor_l_b, surface_dim.floor_r_b], part.floor_l_b)
                    + vf_sum_dims([surface_dim.floor_l_f, surface_dim.floor_r_f], part.floor_l_f)

                vfs.l_wall = vf_sum(surface_dim, part, ["l_wall_f", "l_wall_b"])
                vfs.r_wall = vf_emp_formula(surface_dim.r_wall_f, part.l_wall_f) + vf_emp_formula(surface_dim.r_wall_b, part.l_wall_b)
                vfs.f_wall = vf_sum_dims([surface_dim.f_wall_l, surface_dim.f_wall_r], part.f_wall_l)
                vfs.b_wall = vf_sum_dims([surface_dim.b_wall_l, surface_dim.b_wall_r], part.b_wall_l)
                break
            case 0://asymmetrical
                vfs.ceil = vf_sum(surface_dim, part, ["ceil_l_f", "ceil_l_b", "ceil_r_f", "ceil_r_b"])
                vfs.floor = vf_sum(surface_dim, part, ["floor_l_f", "floor_l_b", "floor_r_f", "floor_r_b"])
                vfs.l_wall = vf_sum(surface_dim, part, ["l_wall_f", "l_wall_b"])
                vfs.r_wall = vf_sum(surface_dim, part, ["r_wall_f", "r_wall_b"])
                vfs.f_wall = vf_sum(surface_dim, part, ["f_wall_l", "f_wall_r"])
                vfs.b_wall = vf_sum(surface_dim, part, ["b_wall_l", "b_wall_r"])
                break
        }
        results[part_name] = vfs
    }
    return results
}

function calc_vfs(surface_dim, rot = 0) {
    let results = {}
    //subdiv = sub-division, dims = dimensions, part = body part, emp = empirical formula
    let vf_sum_helper2 = function (subdiv_dims, part, info, rot) {
        let vfsum = {}
        //mapping: one part vs. multiple sub-divisions
        for (const [emp_name, subdivs] of Object.entries(info)) {
            for (const surface_map of subdivs) {
                let surface = surface_map.shift()
                if (!(surface in vfsum)) {
                    vfsum[surface] = 0
                }
                const vf = surface_map.map(
                    v => {
                        //let subdiv_name = `${surface}_${v}`
                        //let emp_rot_name = rename_rot(emp_name, rot, part.sym)
                        let subdiv_name = rot_helper(`${surface}_${v}`.split('_'), -rot).join('_')
                        let emp_rot_name = emp_name

                        let subdiv = subdiv_dims[subdiv_name]
                        let emp_rotated = part[emp_rot_name]//part[emp_name]

                        return vf_emp_formula(subdiv, emp_rotated)
                    }
                ).reduce((a, b) => a + b)
                vfsum[surface] += vf
            }
        }
        return vfsum
    }

    for (let part_name in body_parts) {
        let vfs = {}
        let part = body_parts[part_name]
        switch (part.sym) {
            case 3://symmetrical in all directions
                vfs = vf_sum_helper2(surface_dim, part, {
                    ceil_l_f: [['ceil', 'l_f', 'l_b', 'r_f', 'r_b']],
                    floor_l_f: [['floor', 'l_f', 'l_b', 'r_f', 'r_b']],
                    l_wall_f: [['l_wall', 'f', 'b'],
                    ['r_wall', 'f', 'b'],
                    ['f_wall', 'l', 'r'],
                    ['b_wall', 'l', 'r']]
                }, rot)
                break
            case 2://symmetrical in front and back
                vfs = vf_sum_helper2(surface_dim, part, {
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
                vfs = vf_sum_helper2(surface_dim, part, {
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
                vfs = vf_sum_helper2(surface_dim, part, {
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

function vf_sum_dims(dims, arg) {
    return dims.map((dim) => vf_emp_formula(dim, arg)).reduce((a, b) => a + b)
}

function vf_sum_dims_map(surface, bodypart, mapping) {
    return Object.entries(mapping)
        .flatMap(([k, varr]) => varr.map(v => vf_emp_formula(surface[v], bodypart[k])))
        .reduce((a, b) => a + b)
}

function vf_sum(surface, bodypart, parts) {
    return parts.map(n => vf_emp_formula(surface[n], bodypart[n])).reduce((a, b) => a + b)
}

function vf_emp_formula(dim, arg) {
    if (dim.c < 0) return NaN
    let a2c = dim.a / dim.c
    let b2c = dim.b / dim.c
    return arg.m * (Math.exp(-arg.n * a2c) + arg.p) * (Math.exp(-arg.q * b2c) + arg.t) + arg.w
}

Tmrt.calc = (room_dim, room_args, human_dim, mode = 0) => {
    let surface_dim = calc_surfaces_dim(room_dim, human_dim)
    let vfs = mode == 0 ? calc_vf(surface_dim) : calc_vfs(surface_dim, human_dim.rot)
    let mrt = calc_mrt(room_args, vfs)
    return mrt
}

export { Tmrt };