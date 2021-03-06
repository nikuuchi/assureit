import model = module('./model')
import model_user = module('./user')

export interface InsertArg {
	data: string;
	prevId?: number;
	dcaseId: number;
	userId: number;
	message?: string;
}
export class Commit {
	public user: model_user.User;
	constructor(public id:number, public prevCommitId: number, public dcaseId: number, public userId: number, public message:string, public data:string, public dateTime: Date, public latestFlag: bool) {}
}
export class CommitDAO extends model.Model {
	insert(params: InsertArg, callback: (commitId: number)=>void): void {
		params.prevId = params.prevId || 0;
		this.con.query('INSERT INTO commit(data, date_time, prev_commit_id, latest_flag,  dcase_id, `user_id`, `message`) VALUES(?,now(),?,TRUE,?,?,?)', 
			[params.data, params.prevId, params.dcaseId, params.userId, params.message], (err, result) => {
			if (err) {
				this.con.rollback();
				this.con.close();
				throw err;
			}
			this._clearLastUpdateFlag(params.dcaseId, result.insertId, () => {
				callback(result.insertId);
			});
		});
	}

	_clearLastUpdateFlag(dcaseId: number, latestCommitId: number, callback: ()=>void): void {
		this.con.query('UPDATE commit SET latest_flag = FALSE WHERE dcase_id = ? AND id <> ? AND latest_flag = TRUE', [dcaseId, latestCommitId], (err, result) => {
			if (err) {
				this.con.rollback();
				this.con.close();
				throw err;
			}
			callback();
		});
	}

	get(commitId: number, callback: (commit: Commit) => void):void {
		this.con.query('SELECT * FROM commit WHERE id=?', [commitId], (err, result) => {
			if (err) {
				this.con.rollback();
				this.con.close();
				throw err;
			}
			result = result[0];
			callback(new Commit(result.id, result.prev_commit_id, result.dcase_id, result.user_id, result.message, result.data, result.date_time, result.latest_flag));
		});
	}

	list(dcaseId: number, callback: (list: Commit[]) => void): void {
		this.con.query({sql: 'SELECT * FROM commit c, user u WHERE c.user_id = u.id AND c.dcase_id = ? ORDER BY c.id', nestTables: true}, [dcaseId], (err, result) => {
			if (err) {
				this.con.rollback();
				this.con.close();
				throw err;
			}

			var list = new Commit[];
			result.forEach((row) => {
				var c = new Commit(row.c.id, row.c.prev_commit_id, row.c.dcase_id, row.c.user_id, row.c.message, row.c.data, row.c.date_time, row.c.latest_flag);
				c.user = new model_user.User(row.u.id, row.u.name, row.u.delete_flag, row.u.system_flag)
				list.push(c);
			});
			callback(list);
		});
	}
}

