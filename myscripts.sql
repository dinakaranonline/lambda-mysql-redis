use actors

show tables;

CREATE TABLE `actors` (
  `id` int(11) NOT NULL,
  `hero` varchar(45) DEFAULT NULL,
  `name` varchar(45) DEFAULT NULL,
  `power` varchar(45) DEFAULT NULL,
  `color` varchar(45) DEFAULT NULL,
  `xp` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
);

select * from actors;


insert into actors values(1,"yes","fireman","fire","red",10);
insert into actors values(2,"no","dogman","bark","brown",50);
insert into actors values(3,"no","bananaman","eat","yellow",30);
insert into actors values(4,"yes","spiderman","fly","red",45);
insert into actors values(5,"no","goatman","jump","white",33);
insert into actors values(6,"maybe","brave","fight","blue",45);
insert into actors values(7,"no","cinderella","wash","pink",12);
insert into actors values(8,"no","elisa","freeze","white",34);
insert into actors values(9,"yes","robinhood","steal","green",67);
insert into actors values(10,"no","gandalf","think","grey",86);
insert into actors values(11,"no","catman","run","brown",84);
insert into actors values(12,"no","dogman","catch","brown",47);
