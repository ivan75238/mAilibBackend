import pool from "../db";
import ICycleDto from "../interfaces/mailib/dto/ICycleDto";

const addCycle = async (cycle: ICycleDto) => {
  await pool.query(
    "INSERT INTO cycles(id, fantlab_id, name, type) values($1, $2, $3, $4)",
    [cycle.id, cycle.fantlab_id, cycle.name, cycle.type]
  );
};

const getCycleById = async (id: string) => {
  const { rows } = await pool.query<ICycleDto>(
    "SELECT * FROM cycles WHERE id=$1",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

const getCycleByFantlabId = async (fantlabId: number) => {
  const { rows } = await pool.query<ICycleDto>(
    "SELECT * FROM cycles WHERE fantlab_id=$1",
    [fantlabId]
  );
  return rows.length > 0 ? rows[0] : null;
};

export { addCycle, getCycleById, getCycleByFantlabId };
